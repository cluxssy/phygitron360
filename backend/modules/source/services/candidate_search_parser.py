import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Standard degree alias dictionaries for comprehensive coverage
DEGREE_SYNONYMS = {
    "btech": ["btech", "b.tech", "b tech", "b.e", "b.e.", "be", "bachelor of technology", "bachelor of engineering"],
    "b.tech": ["btech", "b.tech", "b tech", "b.e", "b.e.", "be", "bachelor of technology", "bachelor of engineering"],
    "be": ["be", "b.e", "b.e.", "btech", "b.tech", "bachelor of engineering", "bachelor of technology"],
    "mtech": ["mtech", "m.tech", "m tech", "m.e", "m.e.", "me", "master of technology", "master of engineering"],
    "m.tech": ["mtech", "m.tech", "m tech", "m.e", "m.e.", "me", "master of technology", "master of engineering"],
    "bca": ["bca", "b.c.a", "bachelor of computer application", "bachelor of computer applications"],
    "mca": ["mca", "m.c.a", "master of computer application", "master of computer applications"],
    "bsc": ["bsc", "b.sc", "b.sc.", "bachelor of science"],
    "msc": ["msc", "m.sc", "m.sc.", "master of science"],
    "mba": ["mba", "m.b.a", "master of business administration"],
    "bba": ["bba", "b.b.a", "bachelor of business administration"],
    "phd": ["phd", "ph.d", "ph.d.", "doctor of philosophy", "doctorate"],
    "diploma": ["diploma", "polytechnic"]
}

# Top colleges/institutions abbreviations to expand
INSTITUTION_SYNONYMS = {
    "iim": ["iim", "indian institute of management"],
    "iit": ["iit", "indian institute of technology"],
    "nit": ["nit", "national institute of technology"],
    "iiit": ["iiit", "indian institute of information technology"],
    "bits": ["bits", "birla institute of technology"],
    "vit": ["vit", "vellore institute of technology"],
    "srm": ["srm", "srm institute of science and technology"],
    "dtu": ["dtu", "delhi technological university"],
    "nsut": ["nsut", "netaji subhas university of technology"],
    "iisc": ["iisc", "indian institute of science"],
    "xlri": ["xlri", "xavier school of management"],
    "fms": ["fms", "faculty of management studies"]
}

KNOWN_MASS_RECRUITERS_OR_COMPANIES = {
    "wipro", "tcs", "infosys", "cognizant", "accenture", "capgemini", "hcl", "tech mahindra",
    "ibm", "oracle", "microsoft", "google", "amazon", "meta", "apple", "deloitte", "ey", "pwc", "kpmg"
}

def parse_search_query_rule_based(query: str) -> Dict[str, Any]:
    """
    Fast, deterministic rule-based query parser that handles:
    - Negations: "not in wipro", "not at tcs", "without infosys", "-wipro", "no accenture"
    - Degrees: "btech", "mtech", "bca", "mca", "mba", etc. with synonym expansion
    - Institutions: "iit", "vit", "nit", etc.
    - Experience ranges: "3+ years", "2 yrs"
    - General and multi-field keywords
    """
    clean_query = query.strip()
    if not clean_query:
        return {
            "raw_query": "",
            "is_complex": False,
            "degrees": [],
            "institutions": [],
            "include_companies": [],
            "exclude_companies": [],
            "include_skills": [],
            "exclude_skills": [],
            "roles": [],
            "min_exp": None,
            "max_exp": None,
            "general_terms": [],
            "exclude_terms": []
        }

    q_lower = clean_query.lower()
    
    exclude_companies = set()
    exclude_terms = set()
    include_degrees = set()
    include_institutions = set()
    include_companies = set()
    include_skills = set()
    roles = set()
    min_exp = None
    max_exp = None

    # 1. Detect Negation Patterns
    # E.g. "not in wipro, tcs", "not at accenture", "never worked at infosys", "without wipro", "-wipro"
    negation_patterns = [
        r'\b(?:not\s+in|not\s+at|not\s+from|never\s+worked\s+(?:in|at)?|without|no\s+past\s+in|not|no)\s+([a-zA-Z0-9\s,\.&-]+?)(?=\s+(?:and|with|who|having|has|\+|$)|$)',
        r'\b(?:exclude|excluding)\s+([a-zA-Z0-9\s,\.&-]+?)(?=\s+(?:and|with|who|having|has|\+|$)|$)',
        r'-([a-zA-Z0-9]+)'
    ]

    matched_spans = []

    for pattern in negation_patterns:
        for match in re.finditer(pattern, q_lower):
            matched_spans.append(match.span())
            raw_ex = match.group(1).strip()
            # Split multiple comma/or/slash-separated terms
            sub_terms = re.split(r'[,/]|(?:\s+or\s+)|\s+and\s+', raw_ex)
            for st in sub_terms:
                st = st.strip()
                if st:
                    exclude_companies.add(st)
                    exclude_terms.add(st)

    # Remove matched negation phrases from the query string so we can parse the positive part
    remaining_text = q_lower
    for span in sorted(matched_spans, key=lambda s: s[0], reverse=True):
        remaining_text = remaining_text[:span[0]] + " " + remaining_text[span[1]:]
    
    # 2. Extract Experience (e.g. "3+ years", "5 yrs", "2 to 4 years")
    exp_range_match = re.search(r'\b(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)\b', remaining_text)
    if exp_range_match:
        min_exp = float(exp_range_match.group(1))
        max_exp = float(exp_range_match.group(2))
        remaining_text = remaining_text[:exp_range_match.start()] + " " + remaining_text[exp_range_match.end():]
    else:
        exp_match = re.search(r'\b(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+exp(?:erience)?)?\b', remaining_text)
        if exp_match:
            min_exp = float(exp_match.group(1))
            remaining_text = remaining_text[:exp_match.start()] + " " + remaining_text[exp_match.end():]

    # 3. Extract Degrees & Expand Synonyms
    words = re.findall(r'[a-zA-Z0-9\.]+', remaining_text)
    used_words = set()

    # Multi-word degree check first
    degree_phrases = [
        ("bachelor of technology", "btech"),
        ("bachelor of engineering", "be"),
        ("master of technology", "mtech"),
        ("master of engineering", "me"),
        ("bachelor of computer applications", "bca"),
        ("master of computer applications", "mca"),
        ("bachelor of science", "bsc"),
        ("master of science", "msc"),
        ("master of business administration", "mba"),
        ("doctor of philosophy", "phd")
    ]
    for phrase, alias in degree_phrases:
        if phrase in remaining_text:
            include_degrees.update(DEGREE_SYNONYMS.get(alias, [alias]))
            remaining_text = remaining_text.replace(phrase, " ")

    # Single-word degree check
    for word in words:
        clean_w = word.strip('.').lower()
        if clean_w in DEGREE_SYNONYMS:
            include_degrees.update(DEGREE_SYNONYMS[clean_w])
            used_words.add(word)
        elif word in DEGREE_SYNONYMS:
            include_degrees.update(DEGREE_SYNONYMS[word])
            used_words.add(word)

    # Multi-word institution check first
    institution_phrases = [
        ("indian institute of management", "iim"),
        ("indian institute of technology", "iit"),
        ("indian institute of information technology", "iiit"),
        ("national institute of technology", "nit"),
        ("birla institute of technology", "bits"),
        ("vellore institute of technology", "vit"),
        ("srm institute of science and technology", "srm"),
        ("delhi technological university", "dtu"),
        ("netaji subhas university of technology", "nsut"),
        ("indian institute of science", "iisc"),
        ("xavier school of management", "xlri"),
        ("faculty of management studies", "fms")
    ]
    for phrase, alias in institution_phrases:
        if phrase in remaining_text:
            include_institutions.update(INSTITUTION_SYNONYMS.get(alias, [alias, phrase]))
            remaining_text = remaining_text.replace(phrase, " ")

    # 4. Extract Institutions (single words)
    words = re.findall(r'[a-zA-Z0-9\.]+', remaining_text)
    for word in words:
        clean_w = word.strip('.').lower()
        if clean_w in INSTITUTION_SYNONYMS:
            include_institutions.update(INSTITUTION_SYNONYMS[clean_w])
            used_words.add(word)

    # 5. Extract Companies / Roles / General Terms
    stop_words = {
        "not", "in", "at", "from", "with", "and", "or", "who", "has", "have", "for",
        "experienced", "experience", "candidate", "candidates", "person", "people",
        "graduated", "graduate", "graduates", "developer", "engineer", "any", "the", "a", "an",
        "years", "year", "yrs", "yr", "exp", "worked", "working", "of", "is", "to", "by", "on", "as"
    }

    # Re-tokenize remaining text after phrase replacements
    cleaned_tokens = re.findall(r'[a-zA-Z0-9#\+\.-]+', remaining_text)
    general_terms = []
    
    for token in cleaned_tokens:
        tok_lower = token.lower()
        if tok_lower in used_words or tok_lower in stop_words or len(token) <= 1:
            continue
        # If it's a known company, mark as include company
        if tok_lower in KNOWN_MASS_RECRUITERS_OR_COMPANIES:
            include_companies.add(tok_lower)
        else:
            general_terms.append(token)

    is_complex = bool(exclude_companies or include_degrees or include_institutions or min_exp or len(general_terms) > 1)

    return {
        "raw_query": clean_query,
        "is_complex": is_complex,
        "degrees": list(include_degrees),
        "institutions": list(include_institutions),
        "include_companies": list(include_companies),
        "exclude_companies": list(exclude_companies),
        "include_skills": list(include_skills),
        "exclude_skills": list(exclude_terms - exclude_companies),
        "roles": list(roles),
        "min_exp": min_exp,
        "max_exp": max_exp,
        "general_terms": general_terms,
        "exclude_terms": list(exclude_terms)
    }


def parse_search_query_with_ai(query: str, ai_service: Any) -> Optional[Dict[str, Any]]:
    """
    LLM-powered query understanding for natural language conversational recruiter queries.
    Uses AIService (Gemini Flash or Groq LLaMA 3) with prompt caching and fast schema.
    """
    if not ai_service:
        return None

    prompt = f"""You are a recruiter query parser. Translate this search query into structured search filters:
Query: "{query}"

Respond strictly with a JSON object in this format:
{{
  "degrees": ["btech", "b.tech", "bachelor of technology"], // degree synonyms to match
  "institutions": [], // colleges or universities to include (e.g. ["iit"])
  "include_companies": [], // companies candidate must have worked at
  "exclude_companies": ["wipro"], // companies candidate must NOT have worked at (e.g. "not in wipro")
  "include_skills": [], // skills required
  "exclude_skills": [], // skills to avoid
  "roles": [], // titles or roles
  "min_exp": null, // minimum years of experience as float or null
  "max_exp": null, // maximum years of experience as float or null
  "location": null, // city or remote
  "general_terms": [] // other positive keyword terms
}}"""

    system_prompt = "You are a concise recruitment search parser. Return ONLY valid JSON."
    
    try:
        # Use sync generator with timeout
        result = ai_service.generate_json_sync(prompt, system_prompt=system_prompt)
        if isinstance(result, dict) and (result.get("degrees") or result.get("exclude_companies") or result.get("include_companies") or result.get("include_skills") or result.get("general_terms")):
            result["raw_query"] = query
            result["is_complex"] = True
            return result
    except Exception as e:
        logger.warning(f"AI search query parsing failed, falling back to rule-based: {e}")

    return None


def parse_search_query(query: str, ai_service: Optional[Any] = None) -> Dict[str, Any]:
    """
    Master parser combining fast rule-based parser with AI enhancement when appropriate.
    """
    rule_parsed = parse_search_query_rule_based(query)
    
    # If the rule-based parser already confidently extracted degrees or exclusions,
    # or if the query is very simple, we don't even need the LLM overhead (saves ~200ms).
    if rule_parsed["exclude_companies"] or rule_parsed["degrees"] or not rule_parsed["is_complex"]:
        return rule_parsed

    # For conversational or long natural-language queries (e.g. > 4 words), try AI if available
    words = query.strip().split()
    if len(words) >= 4 and ai_service:
        ai_parsed = parse_search_query_with_ai(query, ai_service)
        if ai_parsed:
            # Merge rule-based degrees/institutions just in case AI missed any synonyms
            if rule_parsed["degrees"]:
                ai_parsed["degrees"] = list(set(ai_parsed.get("degrees", []) + rule_parsed["degrees"]))
            return ai_parsed

    return rule_parsed
