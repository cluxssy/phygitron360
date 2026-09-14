import json
import re
from datetime import datetime
from typing import Dict, Optional
from openai import OpenAI
from fastapi import HTTPException
from tenacity import retry, stop_after_attempt, wait_exponential

# Strategies Config
COURSE_LEVEL_STRATEGIES = {
    "Level 1": {
        "visual": """**LEVEL 1: Awareness-level (Text and primarily static images)**
Visual approach: Clean, simple, information-focused.
Recommended Strategies:
1. Text with supporting icons (Short bullets with relevant icons)
2. Infographics (Visual summaries of concepts or data)
3. Process flow diagrams (Simple step-by-step visuals)
4. Photographic visuals (Real images showing context or environment)
5. Charts and graphs (Data, trends, or comparisons)
6. Tables""",
        "interactivity": """**Level 1 Interaction Types (Basic):**
1. Click and Reveal (Learner clicks icons/labels -> Information appears)
2. Tabs Interaction (Content divided into tabs -> Learner explores each section)
3. Accordion Interaction (Expand/collapse sections -> Used for steps or rules)
4. Hotspots (Clickable areas on image -> Reveals information)""",
        "assessment": """**Level 1 Assessment Types (Knowledge Check):**
1. Multiple Choice (Single Correct)
2. Multiple Response (Multiple Correct)
3. True / False
4. Fill in the Blank
5. Matching (Terms and definitions, Process and outcomes)"""
    },
    "Level 2": {
        "visual": """**LEVEL 2: Engaging Courses (More contextual, learner-centered visuals)**
Includes all Level 1 visuals, plus:
1. Character-based illustrations (Workplace situations with characters)
2. Before-after comparison visuals (Correct vs incorrect behavior)
3. Demonstration videos (Task or process walkthroughs)
4. Conceptual illustrations (Visual metaphors for abstract ideas)
5. Simple animations
6. Expert talk (Recorded video of SME)""",
        "interactivity": """**Level 2 Interaction Types (Contextual Learning):**
Includes Level 1 interactions, plus:
1. Real-World News Incident (Short real-life case -> Shows consequences)
2. Mini Case Study (Short workplace scenario -> Reflection/Question)
3. Process Walkthrough (Step-by-step guided interaction)
4. Decision Point (Learner chooses an action -> Immediate feedback)""",
        "assessment": """**Level 2 Assessment Types (Applied Understanding):**
Includes Level 1 assessments, plus:
1. Scenario-Based MCQ (Short situation -> Learner chooses best action)
2. Sequencing / Ordering (Arrange steps in correct order)
3. Drag and Drop (Categorization: Do vs Don't, Risk vs Safe)"""
    },
    "Level 3": {
        "visual": """**LEVEL 3: Applied / Scenario-Based Courses (Highly contextual, realistic)**
Includes Level 1 & 2 visuals, plus:
1. Highly realistic scenarios
2. Complex simulations
3. Branching visual paths""",
        "interactivity": """**Level 3 Interaction Types (Advanced):**
Includes Level 1 & 2 interactions, plus:
1. Branching Scenario (Multiple decision paths -> Different endings)
2. Simulation (Software or Role-based)
3.    - Show me: System simulation or conversation simulation
4.    - Try me: Learner performs actions""",
        "assessment": """**Level 3 Assessment Types (Performance-based):**
Includes Level 1 & 2 assessments, plus:
1. Branching Scenario (Multiple decisions, different outcomes)
2. Simulation-Based Assessment (Learner performs actual steps)"""
    }
}

def get_strategy_for_level(interactivity_level: str) -> Dict[str, str]:
    if not interactivity_level:
        return COURSE_LEVEL_STRATEGIES["Level 2"]
    if "Level 1" in interactivity_level:
        return COURSE_LEVEL_STRATEGIES["Level 1"]
    elif "Level 2" in interactivity_level:
        return COURSE_LEVEL_STRATEGIES["Level 2"]
    elif "Level 3" in interactivity_level or "Level 4" in interactivity_level:
        return COURSE_LEVEL_STRATEGIES["Level 3"]
    else:
        return COURSE_LEVEL_STRATEGIES["Level 2"]

def format_intake_text(intake_data: Dict) -> str:
    """Format intake data into readable text."""
    return f"""
Course Title: {intake_data.get('course_title', '')}
Business Unit: {intake_data.get('business_unit', '')}
Course Type: {intake_data.get('course_type', '')}
Target Audience: {intake_data.get('target_audience', '')}
Experience Level: {intake_data.get('experience_level', '')}
Geographic Spread: {intake_data.get('geographic_spread', '')}
Language Preference: {intake_data.get('language_preference', 'American English')}
Style Guide: {intake_data.get('style_guide', 'Clear, professional instructional design language')}
Guidelines: {intake_data.get('guidelines', '')}

Learning Objectives:
1. {intake_data.get('objective_1', '')}
2. {intake_data.get('objective_2', '')}
3. {intake_data.get('objective_3', '')}

Interactivity Level: {intake_data.get('interactivity_level', '')}
Output Required: {intake_data.get('output_required', '')}
Knowledge Check Types: {intake_data.get('knowledge_check_types', 'Multiple Choice, True/False, Fill in the Blank, Scenario-Based')}
Knowledge Check Questions Per Module: {intake_data.get('knowledge_check_count', '3')}
Knowledge Check Difficulty: {intake_data.get('knowledge_check_difficulty', 'Mixed')}
"""

def get_language_rules(intake_data: Dict) -> str:
    preference = intake_data.get('language_preference', 'American English')
    if 'British' in preference:
        return "Use British English spelling and phrasing consistently, such as organise, behaviour, programme, and centre where appropriate."
    return "Use American English spelling and phrasing consistently, such as organize, behavior, program, and center where appropriate."

def get_quality_rules(intake_data: Dict) -> str:
    return f"""
LANGUAGE AND STYLE:
- {get_language_rules(intake_data)}
- Follow this style guide: {intake_data.get('style_guide', 'Clear, professional, concise instructional design language.')}
- Apply these project guidelines: {intake_data.get('guidelines', 'Use plain language, correct spelling, and a consistent instructional tone.')}
- Run a spelling and grammar pass before finalizing. Do not output shuffled phrases, sentence fragments, or out-of-sequence content.
- Keep each paragraph logically ordered: concept, example, learner action, then feedback or takeaway.
"""

def get_knowledge_check_rules(intake_data: Dict) -> str:
    return f"""
KNOWLEDGE CHECK REQUIREMENTS:
- Add a dedicated Knowledge Check immediately after EACH content module, including after Module 1.
- Use {intake_data.get('knowledge_check_count', '3')} question(s) per module.
- Difficulty: {intake_data.get('knowledge_check_difficulty', 'Mixed')}.
- Allowed types: {intake_data.get('knowledge_check_types', 'Multiple Choice, True/False, Fill in the Blank, Scenario-Based')}.
- Each knowledge check must align to that module's objectives and include the correct answer plus feedback.
- Use varied assessment types across modules when multiple types are selected.
"""
@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=2, min=4, max=30), reraise=True)
def generate_design_document(api_key: str, intake_data: Dict, content: str) -> str:
    """Generate Design Document using Groq Llama 3.1 8B Instant."""
    try:
        if not api_key:
            raise HTTPException(status_code=401, detail="Groq API key is missing")

        client = OpenAI(api_key=api_key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
        strategies = get_strategy_for_level(intake_data.get('interactivity_level', ''))
        
        prompt = f"""You are an expert Instructional Designer creating a comprehensive Design Document.
        
INTAKE INFORMATION:
{format_intake_text(intake_data)}

REQUIRED VISUAL STRATEGIES:
{strategies['visual']}

REQUIRED INTERACTIVITY TYPES:
{strategies['interactivity']}

REQUIRED ASSESSMENT TYPES:
{strategies['assessment']}

{get_knowledge_check_rules(intake_data)}
{get_quality_rules(intake_data)}
SOURCE CONTENT:
{content[:8000]}

TASK:
Create a DETAILED Design Document following this EXACT structure.
The user wants "EXtreme Detail" and "Human Creativity" - do not summarize.

1. PROJECT INFORMATION
   - Project Name: {intake_data.get('course_title', '')}
   - Business Unit: {intake_data.get('business_unit', '')}
   - Target Audience: {intake_data.get('target_audience', '')}
   - Experience Level: {intake_data.get('experience_level', '')}
   - Date: {datetime.now().strftime('%Y-%m-%d')}

2. COURSE OVERVIEW
   - Context/Background: [2-3 sentences on why this training is needed based on the source content]
   - Project Goal: [1-2 sentences on business outcomes]
   - Duration: [Estimated total course duration]

3. LEARNING OBJECTIVES
   - {intake_data.get('objective_1', '')}
   - {intake_data.get('objective_2', '')}
   - {intake_data.get('objective_3', '')}

4. MODULE BREAKDOWN (CRITICAL: Use this EXACT table format with pipe separators - NO Markdown formatting inside cells)

Here is a GOLD STANDARD EXAMPLE of the detail required (Cybersecurity theme):
| Module | Delivery Mode | Learning Objectives | Topics | Recommended Strategy | Activities/Assessment | Duration |
|--------|---------------|---------------------|--------|----------------------|-----------------------|----------|
| Module 1: Introduction to Cybersecurity | Self-paced eLearning | â€¢ Define basic cyber security concepts.<br>â€¢ Explain why cyber security is critical for organizations.<br>â€¢ Identify common types of malware and cyber attacks encountered in day-to-day work.<br>â€¢ Recognize early warning signs of cyber threats.<br>â€¢ Understand the impact of security breaches on business continuity. | â€¢ Definition of Cyber Security<br>â€¢ Importance of Cyber Security<br>â€¢ Cyber Security in the Digital World<br>â€¢ Malware & Ransomware:<br>&nbsp;&nbsp;- Definition of malware and its types (viruses, worms, spyware, trojans).<br>&nbsp;&nbsp;- What is ransomware and how does it work?<br>&nbsp;&nbsp;- Consequences of malware and ransomware attacks.<br>â€¢ Social Engineering Attack:<br>&nbsp;&nbsp;- What is social engineering?<br>&nbsp;&nbsp;- Examples: pretexting, baiting, tailgating, and impersonation. | Real-world cyberattack examples set the stage, immediately immersing learners in the stakes of security. Interactive simulations then challenge users to identify phishing attempts in a safe, controlled environment. Case studies reveal the business impact of data breaches, followed by role-playing activities where learners must make critical security decisions under time pressure. The learning path concludes with a hands-on drag-and-drop exercise matching threats to defense strategies. | â€¢ Drag and drop cybersecurity concepts<br>â€¢ Multiple-choice questions on cybersecurity basics. | 2 hour |

NOW, generate the table for THIS course ({intake_data.get('course_title', 'Untitled')}) following that EXACT LEVEL OF DETAIL.

CRITICAL INSTRUCTIONS FOR GENERATION:
1.  **MODULE COUNT**: You MUST generate exactly {intake_data.get('num_modules', '3')} content modules (Module 1 to Module {intake_data.get('num_modules', '3')}).
2.  **FORBIDDEN PHRASES**: 
    *   **NEVER start Objectives with**: "This module will...", "Learners will be able to...", "By the end of this module...". **Start directly with the verb** (e.g., "Analyze...", "Create...", "Identify...").
    *   **NEVER start Strategies with**: "This module will...", "In this module...", "Learners will...". **Start with the action** (e.g., "A simulation explores...", "Case studies highlight...", "Interactive scenarios guided the learner...").
3.  **VARIETY**: Every module MUST sound different. Do not repeat sentence structures, examples, activities, or topic blocks.
4.  **ALIGNMENT**: Ensure "Recommended Strategy" and "Activities/Assessment" align with the specific Learning Objectives and ID Principles provided.
5.  **NO DUPLICATE MODULES**: Each module must cover a distinct part of the source content. Do not repeat the same topics, learning sections, or strategy descriptions across modules.
6.  **PER-MODULE KNOWLEDGE CHECKS**: After every module row, add a separate row titled "Knowledge Check: Module X" with module-specific questions, correct answers, and feedback in the Activities/Assessment cell.

| Module | Delivery Mode | Learning Objectives | Topics | Recommended Strategy | Activities/Assessment | Duration |
|--------|---------------|---------------------|--------|----------------------|-----------------------|----------|
| Module 1: [Title] | Self-paced eLearning | [Strong verb objectives using <br>] | [Module 1 topics only] | [Detailed, unique Module 1 strategy] | [Specific activity aligned to Module 1] | [Time] |
| Knowledge Check: Module 1 | Self-paced eLearning | Assess Module 1 objectives | Module 1 formative assessment | Short assessment experience | Question type, question stem, options where relevant, correct answer, and feedback | 10 min |
| Module 2: [Title] | Self-paced eLearning | [Strong verb objectives using <br>] | [Module 2 topics only, no repeats from Module 1] | [Detailed, unique Module 2 strategy] | [Specific activity aligned to Module 2] | [Time] |
| Knowledge Check: Module 2 | Self-paced eLearning | Assess Module 2 objectives | Module 2 formative assessment | Short assessment experience | Question type, question stem, options where relevant, correct answer, and feedback | 10 min |
| ... [GENERATE EXACTLY {intake_data.get('num_modules', '3')} MODULES TOTAL, each followed by its own Knowledge Check row] ... |
| Summary & Conclusion | Self-paced eLearning | â€¢ Review key concepts | Summary & Key takeaways | Recap points | Certificate of Completion | 15 min |

5. INSTRUCTIONAL STRATEGY
   - Pedagogy: [Approach based on {intake_data.get('interactivity_level', '')}]
   - Interactivity: [Specific interactive elements from REQUIRED INTERACTIVITY TYPES]
   - Media: [Specific visual strategies from REQUIRED VISUAL STRATEGIES]

6. ASSESSMENT STRATEGY
   - Formative: [Knowledge checks details]
   - Summative: [Final assessment details]
   - Criteria: [Pass/fail criteria]

7. TECHNICAL SPECIFICATIONS
   - LMS: SCORM 1.2
   - Devices: Desktop/Laptop, Tablet

IMPORTANT INSTRUCTIONS:
- **TONE**: Write in a **natural, professional human voice**. Avoid AI buzzwords like "delve", "comprehensive tapestry", "ensure", "foster". Use active voice.
- **NO EXTRA HEADINGS**: Do not add extra bold section headers (e.g. "**Project Information**") before the numbered sections (e.g. "1. PROJECT INFORMATION"). Start sections directly with the number.
- **NO REPETITION**: Do not repeat phrasing, sections, topics, examples, or activities across modules. Make each strategy unique and specific to the content.
- **NARRATIVE FLOW**: In "Recommended Strategy", tell a story of how the learner experiences the module.
- **COHERENCE**: Keep sentences in natural order. Fix spelling, grammar, and punctuation before final output.
- **KNOWLEDGE CHECK PLACEMENT**: Include a Knowledge Check row immediately after each module row, including after Module 1.
- EXTRACT EXTENSIVE DETAILS from the source content.
- NO GENERIC PLACEHOLDERS.
- Do NOT use bold ** or italic * formatting inside the table cells. Keep text clean.
- Use <br> for line breaks within table cells.
- Ensure the table structure is perfect.

Generate the complete Design Document now:"""

        response = client.chat.completions.create(
            model="gemini-3.5-flash",
            messages=[
                {"role": "system", "content": "You are an expert Instructional Designer who creates detailed, professional design documents based on source materials."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        result = response.choices[0].message.content

        return result
            
    except Exception as e:
        # Increase visibility of errors
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Error generating Design Document: {error_msg}")


import time as _time

def _generate_single_module_type1(client, module_num: int, total_modules: int, design_doc: str, intake_data: Dict, content: str, strategies: Dict) -> str:
    """Generate storyboard for a single module (Type 1 format). Kept under 6000 TPM."""
    prompt = f"""Generate storyboard for MODULE {module_num} ONLY (of {total_modules}).

DESIGN DOCUMENT:
{design_doc[:3000]}

SOURCE CONTENT:
{content[:2000]}

RULES:
{get_quality_rules(intake_data)}
{get_knowledge_check_rules(intake_data)}
- Include the module knowledge check as the final screen for this module.
- OST: Actual text learner reads. Real facts, definitions, bullet points. NEVER "The narrator explains..."
- AUDIO: Actual narrator script. Conversational, professional, 5-8 sentences. End with "Click Next to continue." NEVER "The narrator says..."
- VISUAL: Specific designer directions. Name images ("Show static image of X"), describe animations, layout, navigation.
- No placeholders. No AI buzzwords. Content from source only.
- Use <br> for line breaks in cells. Each row = ONE line.
- CRITICAL: Break the module content down into AT LEAST 5 separate screens. 
- CRITICAL: Each screen MUST have its own "Screen X.X Title:" header, followed by a separate Markdown table for that screen. NEVER merge all content into a single table.

FORMAT:

=============================================================================
Module {module_num}: [Title from Design Doc]
=============================================================================

Screen {module_num}.1 Title: [Descriptive Title]

| ON-SCREEN TEXT (OST) | AUDIO NARRATION | VISUAL INSTRUCTIONS & DEVELOPER NOTES |
| :--- | :--- | :--- |
| [Actual text with bullets] | [Actual narration script] | [Specific graphic directions] |

Generate 5-8 screens for Module {module_num} now:"""

    response = client.chat.completions.create(
        model="gemini-3.5-flash",
        messages=[
            {"role": "system", "content": "You are a senior eLearning Storyboard Developer. NEVER summarize or skip content. Be extremely detailed. OST = real learner text. Audio = actual narrator script. Visual = specific graphic designer directions. CRITICAL: Every table row MUST be ONE PHYSICAL LINE. Use <br> for all internal line breaks."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=8192,
    )
    return response.choices[0].message.content



def _generate_single_module_type2(client, module_num: int, total_modules: int, design_doc: str, intake_data: Dict, content: str, strategies: Dict) -> str:
    """Generate storyboard for a single module (Type 2 tabular format). Kept under 6000 TPM."""
    prompt = f"""Generate Type 2 tabular storyboard for MODULE {module_num} ONLY (of {total_modules}).

DESIGN DOCUMENT:
{design_doc[:3000]}

SOURCE CONTENT:
{content[:2000]}

RULES:
{get_quality_rules(intake_data)}
{get_knowledge_check_rules(intake_data)}
- Include a Knowledge Check row as the final row for this module.
- SECTION: Descriptive names (Introduction, Core Concepts, Activity, Quiz, Summary).
- TOPICS: Specific objectives and sub-topics from source.
- VISUAL: Specific directions ("Show static image of X", animations, layouts, facilitator videos).
- OST: Actual learner-facing text with bullets. Real definitions, facts. NEVER meta-descriptions.
- AUDIO: Actual narrator script. Conversational, professional. NEVER "The narrator explains". Include cues like "Show image #1>>". End with "Click Next to continue."
- STATUS: "Draft".
- ACTIONS: Production notes ("Slide design required", "Animation needed").
- Use <br> for line breaks. Each row = ONE line. 7 columns exactly.

FORMAT:

MODULE {module_num}: [Title from Design Doc]

| Section | Topics | Visual Instructions/Developer Notes | On-screen text | Audio Narration | Status | Actions required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [Name] | [Topics] | [Visual directions] | [Actual OST] | [Actual script] | Draft | [Actions] |

Generate 5-8 rows for Module {module_num} now:"""

    response = client.chat.completions.create(
        model="gemini-3.5-flash",
        messages=[
            {"role": "system", "content": "You are a senior eLearning Storyboard Developer. NEVER summarize or skip content. Be extremely detailed. OST = real learner text. Audio = actual narrator script. Visual = specific graphic designer directions. CRITICAL: Every table row MUST be ONE PHYSICAL LINE. Use <br> for all internal line breaks."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=8192,
    )
    return response.choices[0].message.content



@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=3, min=5, max=60), reraise=True)
def _call_module_with_retry(generate_fn, client, module_num, total_modules, design_doc, intake_data, content, strategies):
    """Wrapper to retry individual module generation with exponential backoff for rate limits."""
    return generate_fn(client, module_num, total_modules, design_doc, intake_data, content, strategies)


def generate_storyboard(api_key: str, design_doc: str, intake_data: Dict, content: str, storyboard_type: str) -> str:
    """Generate Storyboard module-by-module to avoid token truncation."""
    try:
        if not api_key:
            raise HTTPException(status_code=401, detail="Groq API key is missing")

        client = OpenAI(api_key=api_key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
        strategies = get_strategy_for_level(intake_data.get('interactivity_level', ''))
        num_modules = int(intake_data.get('num_modules', 3))

        generate_fn = _generate_single_module_type1 if storyboard_type == "Type 1" else _generate_single_module_type2

        course_title = intake_data.get('course_title', 'Untitled Course')
        all_modules = []
        all_modules.append(f"# STORYBOARD â€” {course_title}\n")
        intro = "## Course Overview\n| ON-SCREEN TEXT (OST) | AUDIO NARRATION | VISUAL INSTRUCTIONS & DEVELOPER NOTES |\n| :--- | :--- | :--- |\n| **Welcome to the course!**<br>In this program, you will learn the key concepts outlined in the design document. | Welcome! Let's get started on this learning journey. | Show title screen with engaging graphics. |\n"
        all_modules.append(intro)

        for i in range(1, num_modules + 1):
            module_content = _call_module_with_retry(
                generate_fn, client, i, num_modules, design_doc, intake_data, content, strategies
            )
            module_content = fix_markdown_tables(module_content)
            all_modules.append(module_content)
            # Rate limit delay between modules (Groq free tier)
            # 20s gap prevents TPM (tokens per minute) limit errors with larger outputs
            if i < num_modules:
                _time.sleep(2)

        return "\n\n---\n\n".join(all_modules)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating Storyboard: {str(e)}")



def fix_markdown_tables(text: str) -> str:
    """Post-process AI output to fix common markdown table formatting issues.
    
    Fixes:
    1. Heading markers (##) on pipe-delimited table rows
    2. Bold wrappers (**) around table rows
    3. Missing leading/trailing pipes
    4. Missing separator lines
    5. CRITICAL: Merges 'continuation rows' â€” rows that are missing pipes 
       or have very few pipes, which means the AI split a single cell 
       across multiple lines.
    """
    if not text:
        return text
    
    lines = text.split('\n')
    
    # === PASS 1: Normalize & Fix basic formatting ===
    pass1 = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            pass1.append("")
            continue
            
        # Remove heading markers from table lines
        heading_match = re.match(r'^(#{1,6})\s*(.+\|.+)$', stripped)
        if heading_match:
            stripped = heading_match.group(2).strip()
            line = stripped
        
        # Remove bold wrappers from table rows
        bold_match = re.match(r'^\*\*(.+\|.+)\*\*$', stripped)
        if bold_match:
            stripped = bold_match.group(1).strip()
            line = stripped
            
        pass1.append(line)
        
    # === PASS 2: Table Reconstruction & Continuation Merging ===
    final = []
    i = 0
    while i < len(pass1):
        line = pass1[i]
        stripped = line.strip()
        
        # Detect if this line looks like a table row (contains pipes) or follows one
        is_sep = bool(re.match(r'^\|?[\s\-:|]+\|?$', stripped))
        pipe_count = stripped.count('|')
        
        # If it's a separator, ensure it has enough pipes if possible
        if is_sep and final and final[-1].strip().count('|') >= 2:
            prev_cols = final[-1].strip().count('|') - (1 if final[-1].strip().startswith('|') else 0) - (1 if final[-1].strip().endswith('|') else 0) + 1
            if pipe_count < 2: # Fix |---| style
                line = '|' + '|'.join(['---'] * prev_cols) + '|'
            final.append(line)
            i += 1
            continue

        # Logic: If a line has 2+ pipes, it's a row.
        # If the next few lines are "loose" (0 pipes or 1 pipe), they belong to this row.
        if pipe_count >= 2:
            # Ensure it starts and ends with pipes.
            if not stripped.startswith('|'): stripped = '| ' + stripped
            if not stripped.endswith('|'): stripped = stripped + ' |'
            
            # Extract cells
            current_cells = [c.strip() for c in stripped[1:-1].split('|')]
            
            j = i + 1
            while j < len(pass1):
                next_line = pass1[j]
                next_stripped = next_line.strip()
                
                # If next line is empty, skip it and continue lookahead (AI often adds random newlines)
                if not next_stripped:
                    j += 1
                    continue
                
                next_pipe_count = next_stripped.count('|')
                
                # CRITICAL: If the next line has 2+ pipes, it's definitely a NEW row. Stop lookahead.
                if next_pipe_count >= 2:
                    break
                    
                # If it's a header or obvious non-table text, stop.
                if next_stripped.startswith('#') or next_stripped.upper().startswith('SCREEN') or next_stripped.upper().startswith('MODULE'):
                    break
                
                # Merge into the last non-empty cell (usually Actions/Visuals or OST)
                for idx in range(len(current_cells)-1, -1, -1):
                    if current_cells[idx] or idx == 0:
                        current_cells[idx] += '<br>' + next_stripped
                        break
                j += 1
            
            final.append('| ' + ' | '.join(current_cells) + ' |')
            i = j
        else:
            final.append(line)
            i += 1
            
    return '\n'.join(final)


def beautify_uploaded_content(api_key: str, content: str, target_type: str, storyboard_type: Optional[str] = None) -> str:
    """Uses AI to format a raw file dump into a professional project document."""
    try:
        if not api_key:
            raise HTTPException(status_code=401, detail="Groq API key is missing")

        client = OpenAI(api_key=api_key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
        
        # Storyboard Format Detection
        is_storyboard_type2 = False
        if target_type == "storyboard":
            if storyboard_type == "Type 2":
                 is_storyboard_type2 = True
            elif storyboard_type == "Type 1":
                 is_storyboard_type2 = False
            else:
                # Auto-detect if not explicitly provided
                sample_lines = content[:10000].split('\n')
                for line in sample_lines:
                    if line.count('|') >= 7: 
                        is_storyboard_type2 = True
                        break
        
        doc_name = "Design Document" if target_type == "design_doc" else "Storyboard"
        
        design_doc_rules = """
2. TARGET DOCUMENT: Design Document (High-Level Course Map)
   - METADATA RULE: Headers like "TRAINING PROGRAM FOR IT", "Trainers", or "Instructor" MUST be standard text headers (###) outside the table.
   - CRITICAL: NEVER put "Program Titles" or "Trainers" as headers of a Markdown table.
   - TABLE START: The table MUST start with exactly these headers: | Module | Delivery Mode | Learning Objectives | Topics | Recommended Strategy | Activities/Assessment | Duration
   - AGGREGATION: You MUST group all content for one module (e.g., Module 1) into exactly ONE row. Use <br> for bullet points.
   - DO NOT create multiple rows for the same module. If you see objectives scattered across lines, MERGE THEM into the 'Learning Objectives' cell."""

        type1_storyboard_rules = """
2. TARGET DOCUMENT: Storyboard (3-Column Format)
   - You MUST act as a STRICT LITERAL MAPPER.
   - For EACH screen, you MUST output:
     Screen X.X Title: [Title Name]
     
     | On-Screen Text (OST) | Audio Narration | Visual Instructions & Developer Notes |
     | :--- | :--- | :--- |
     | [OST content] | [Narration content] | [Visuals content] |
     
   - EACH screen title and table MUST be on its own line.
   - Use <br> for line breaks inside table cells.
   - DO NOT combine multiple screens into one table.
   - DO NOT summarize or truncate. Output the ENTIRE document exactly as provided."""

        type2_storyboard_rules = """
2. TARGET DOCUMENT: Storyboard (7-Column Format)
   - You MUST act as a STRICT LITERAL MAPPER for this tabular format.
   - You MUST output a Markdown table with EXACTLY 7 COLUMNS for each module.
   - HEADERS: Section | Topics | Visual Instructions/Developer Notes | On-screen text | Audio Narration | Status | Actions required
   - YOU MUST output the standard Markdown separator line exactly like this after the headers: `|---|---|---|---|---|---|---|`
   - For EACH module, start with a header like "MODULE X: [Module Title]".
   - Use <br> for line breaks inside cells.
   - DO NOT summarize or truncate. Output the ENTIRE document exactly as provided."""

        if target_type == "design_doc":
            type_rules = design_doc_rules
        elif is_storyboard_type2:
            type_rules = type2_storyboard_rules
        else:
            type_rules = type1_storyboard_rules

        # === THE ENHANCEMENT FIX: Chunking the Input ===
        max_chunk_chars = 18000
        paragraphs = content.split('\n\n')
        chunks = []
        current_chunk = ""
        for p in paragraphs:
            if len(current_chunk) + len(p) > max_chunk_chars and current_chunk:
                chunks.append(current_chunk)
                current_chunk = p
            else:
                current_chunk += "\n\n" + p if current_chunk else p
        if current_chunk:
            chunks.append(current_chunk)

        print(f"Beautifying uploaded content in {len(chunks)} chunks...")
        
        # --- NEW: Localized Retry Logic ---
        # This only retries the specific chunk that fails, avoiding the "death spiral"
        @retry(stop=stop_after_attempt(15), wait=wait_exponential(multiplier=2, min=15, max=60), reraise=True)
        def generate_chunk(prompt_text):
            return client.chat.completions.create(
                model="gemini-3.5-flash",
                messages=[
                    {"role": "system", "content": "You are a master Instructional Designer. You follow structural and formatting constraints perfectly. You never put non-table data inside a table."},
                    {"role": "user", "content": prompt_text}
                ],
                temperature=0.1,
                max_tokens=8192,
            ).choices[0].message.content
            
        full_result = ""
        
        for idx, chunk in enumerate(chunks):
            if target_type == "design_doc" and idx == 0:
                overview_rule = '4. STRUCTURE: Add a professional "PROJECT INFORMATION" and "COURSE OVERVIEW" section at the VERY TOP.'
            else:
                overview_rule = '4. STRUCTURE: DO NOT include Project Information or Course Overview. Start directly with the first Module or Screen header.'

            prompt = f"""You are an expert Instructional Designer. 
I have extracted raw text from an uploaded file (likely an Excel or PPTX). 

TASK:
Convert this raw text into a professional {doc_name} ONLY in Markdown format.

THE INPUT DATA:
This is raw text extracted from a file. If it was extracted from a spreadsheet, columns will be separated by pipes (|).

STRICT RULES:
1. YOU ARE A REFORMATTER, NOT A SUMMARIZER. Do not discard any info. You must return 100% of the original content.
{type_rules}

3. CRITICAL TABLE FORMATTING RULES (MUST FOLLOW EXACTLY):
   - NEVER use Markdown heading syntax (## or #) on a line that contains a table row with pipes.
   - EVERY table row (header AND data) MUST start with | and end with |
   - The separator line MUST appear immediately after the header row (e.g. |---|---|---|)
   - There MUST be a blank line before the table header and after the last table row
   - Do NOT wrap table rows in bold (**) markers

{overview_rule}

5. FORMAT:
   - Use professional language. No AI fluff.
   - Do NOT add introductory text. Just the Markdown doc.
   - Do NOT use heading syntax (# or ##) on any line that contains pipe characters (|).

RAW EXTRACTED CONTENT (PART {idx+1} of {len(chunks)}):
{chunk}

Generate the professional {doc_name} Markdown now:"""

            # Using our new localized retry function
            chunk_text = generate_chunk(prompt)
            
            if full_result:
                full_result += "\n\n" + chunk_text
            else:
                full_result = chunk_text
                
            if idx < len(chunks) - 1:
                _time.sleep(15)

        return fix_markdown_tables(full_result)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error beautifying content: {str(e)}")
