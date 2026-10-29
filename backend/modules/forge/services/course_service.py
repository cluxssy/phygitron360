"""
Forge Module — Course Service
Handles SCORM package extraction, XML parsing, runtime API shim injection,
and course progress sync logic.
"""
import os
import re
import shutil
import zipfile
import logging
import xml.etree.ElementTree as ET
from typing import Optional, Dict, Any
from pathlib import Path
from backend.core.database import DATA_DIR

logger = logging.getLogger(__name__)

SCORM_RUNTIME_SHIM = r"""<script>
/* PHYGITRON_SCORM_SHIM_V2 */
(function () {
  var data = {
    "cmi.core.student_id": "employee",
    "cmi.core.student_name": "Learner",
    "cmi.learner_id": "employee",
    "cmi.learner_name": "Learner",
    "cmi.core.lesson_location": "",
    "cmi.location": "",
    "cmi.core.lesson_status": "not attempted",
    "cmi.completion_status": "incomplete",
    "cmi.success_status": "unknown",
    "cmi.suspend_data": "",
    "cmi.core.suspend_data": "",
    "cmi.launch_data": "",
    "cmi.core.launch_data": "",
    "cmi.core.score.raw": "",
    "cmi.score.raw": "",
    "cmi.core.score.min": "0",
    "cmi.core.score.max": "100",
    "cmi.score.scaled": "0",
    "cmi.core.lesson_mode": "normal",
    "cmi.mode": "normal"
  };
  var lastError = "0";
  var _initDataReceived = false;
  function ok() { lastError = "0"; return "true"; }

  function calculateScormProgress(d) {
    var curStatus = String(d["cmi.core.lesson_status"] || d["cmi.completion_status"] || d["cmi.success_status"] || "").toLowerCase();
    if (curStatus === "completed" || curStatus === "passed" || curStatus === "complete" || curStatus === "success") {
      return 100;
    }
    var progress = null;

    if (d["cmi.progress_measure"]) {
      var pm = parseFloat(d["cmi.progress_measure"]);
      if (!isNaN(pm) && pm > 0) progress = pm <= 1 ? Math.round(pm * 100) : Math.round(pm);
    }

    if (progress === null && d["cmi.core.lesson_progress"]) {
      var lp = parseFloat(d["cmi.core.lesson_progress"]);
      if (!isNaN(lp) && lp > 0) progress = Math.round(lp);
    }

    var loc = d["cmi.location"] || d["cmi.core.lesson_location"] || "";
    if (progress === null && loc) {
      var mFrac = String(loc).match(/(\d+)\s*(?:\/|of)\s*(\d+)/i);
      if (mFrac && parseFloat(mFrac[2]) > 0) {
        progress = Math.min(100, Math.round((parseFloat(mFrac[1]) / parseFloat(mFrac[2])) * 100));
      }
    }

    var sd = String(d["cmi.suspend_data"] || d["cmi.core.suspend_data"] || "");
    if (progress === null && sd && sd.charAt(0) === "{") {
      try {
        var obj = JSON.parse(sd);
        if (typeof obj.progress === "number" && obj.progress > 0) {
          progress = Math.min(100, Math.round(obj.progress));
        } else if (typeof obj.slide === "number" && typeof obj.total === "number" && obj.total > 0) {
          progress = Math.min(100, Math.round(((obj.slide + 1) / obj.total) * 100));
        }
      } catch (e) {}
    }

    if (progress === null && sd && sd.indexOf(",") !== -1 && sd.charAt(0) !== "{") {
      var pts = sd.split(",");
      var vd = 0;
      for (var pi = 0; pi < pts.length; pi++) {
        var pt = pts[pi].trim();
        if (pt === "1" || pt === "true" || pt === "v") vd++;
      }
      if (pts.length >= 4) {
        progress = Math.min(98, Math.round((vd / pts.length) * 100));
      }
    }

    if (progress === null && sd && sd.charAt(0) !== "{" && sd.indexOf(",") === -1) {
      var fc = sd.split("~")[0];
      var mb = fc.match(/^[0-9a-zA-Z_$~]{1,6}([0-9a-zA-Z_$]{4,})/);
      var totalSlides = window._PHYGITRON_TOTAL_SLIDES || 0;
      if (mb && mb[1] && totalSlides > 0) {
        var numViewed = Math.floor(mb[1].length / 2);
        if (numViewed > 0) {
          progress = Math.min(98, Math.round((numViewed / totalSlides) * 100));
        }
      }
    }

    return progress;
  }

  function extractBookmark(d) {
    var loc = d["cmi.location"] || d["cmi.core.lesson_location"] || "";
    if (loc && loc.trim() !== "") return loc;

    var sd = String(d["cmi.suspend_data"] || d["cmi.core.suspend_data"] || "");
    if (sd && sd.charAt(0) === "{") {
      try {
        var obj = JSON.parse(sd);
        if (typeof obj.slide === "number") {
          return "slide_" + (obj.slide + 1) + (obj.total ? "/" + obj.total : "");
        }
      } catch (e) {}
    }

    var mPlayer = sd.match(/_player\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)/);
    if (mPlayer && mPlayer[2]) {
      return "Slide: " + mPlayer[2];
    }
    return loc;
  }

  function _doReady() {
    var prog = calculateScormProgress(data);
    var bm = extractBookmark(data);
    try {
      window.parent.postMessage({ type: "phygitron:scorm-ready", progressPercent: prog, location: bm }, "*");
    } catch (e) {}
  }

  window.addEventListener("message", function (event) {
    if (!event.data || typeof event.data !== "object") return;
    if (event.data.type === "phygitron:scorm-init-data") {
      var init = event.data.data || {};
      for (var k in init) {
        if (Object.prototype.hasOwnProperty.call(init, k) && init[k] != null && init[k] !== "") {
          data[k] = String(init[k]);
        }
      }
      _initDataReceived = true;
      _doReady();
    }
  });

  var api = {
    LMSInitialize: function () {
      if (!_initDataReceived) {
        try { window.parent.postMessage({ type: "phygitron:scorm-needs-init" }, "*"); } catch (e) {}
        setTimeout(function () {
          if (!_initDataReceived) {
            _initDataReceived = true;
            _doReady();
          }
        }, 1500);
      } else {
        _doReady();
      }
      return ok();
    },
    Initialize: function () { return this.LMSInitialize(); },
    LMSFinish: function () {
      var prog = calculateScormProgress(data);
      var bm = extractBookmark(data);
      try { window.parent.postMessage({ type: "phygitron:scorm-finish", data: data, progressPercent: prog, location: bm }, "*"); } catch (e) {}
      return ok();
    },
    Terminate: function () { return this.LMSFinish(); },
    LMSCommit: function () {
      var prog = calculateScormProgress(data);
      var bm = extractBookmark(data);
      if (prog !== null) {
        data["cmi.progress_measure"] = String(prog / 100);
        data["progress_percent"] = prog;
      }
      if (bm) {
        data["cmi.location"] = bm;
        data["cmi.core.lesson_location"] = bm;
      }
      try {
        window.parent.postMessage({
          type: "phygitron:scorm-commit",
          data: data,
          progressPercent: prog,
          location: bm
        }, "*");
      } catch (e) {}
      return ok();
    },
    Commit: function () { return this.LMSCommit(); },
    LMSGetValue: function (key) {
      lastError = "0";
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "";
    },
    GetValue: function (key) { return this.LMSGetValue(key); },
    LMSSetValue: function (key, value) {
      data[key] = String(value == null ? "" : value);
      if (key === "cmi.core.lesson_location") data["cmi.location"] = data[key];
      if (key === "cmi.location") data["cmi.core.lesson_location"] = data[key];
      if (key === "cmi.core.suspend_data") data["cmi.suspend_data"] = data[key];
      if (key === "cmi.suspend_data") data["cmi.core.suspend_data"] = data[key];
      if (key === "cmi.core.score.raw") data["cmi.score.raw"] = data[key];
      if (key === "cmi.score.raw") data["cmi.core.score.raw"] = data[key];

      var prog = calculateScormProgress(data);
      var bm = extractBookmark(data);
      if (prog !== null) {
        data["cmi.progress_measure"] = String(prog / 100);
        data["progress_percent"] = prog;
      }
      if (bm && !data["cmi.location"]) {
        data["cmi.location"] = bm;
        data["cmi.core.lesson_location"] = bm;
      }

      lastError = "0";
      try {
        window.parent.postMessage({
          type: "phygitron:scorm-set",
          key: key,
          value: data[key],
          allData: data,
          progressPercent: prog,
          location: bm
        }, "*");
      } catch (e) {}
      return "true";
    },
    SetValue: function (key, value) { return this.LMSSetValue(key, value); },
    LMSGetLastError: function () { return lastError; },
    GetLastError: function () { return lastError; },
    LMSGetErrorString: function (code) { return code === "0" ? "No error" : "SCORM runtime error"; },
    GetErrorString: function (code) { return this.LMSGetErrorString(code); },
    LMSGetDiagnostic: function () { return ""; },
    GetDiagnostic: function () { return ""; }
  };

  window.API = api;
  window.API_1484_11 = api;

  try {
    window.parent.postMessage({ type: "phygitron:scorm-needs-init" }, "*");
  } catch (e) {}
})();
</script>
"""


def inject_scorm_shim(html_path: str, total_slides: Optional[int] = None) -> None:
    """Inject SCORM runtime shim into HTML files so packages communicate with CoursePlayer.jsx."""
    try:
        with open(html_path, "r", encoding="utf-8", errors="ignore") as handle:
            html = handle.read()
    except OSError:
        return

    pattern = re.compile(
        r'<script>[\s\S]*?/\*\s*PHYGITRON_SCORM_SHIM_V2\s*\*/[\s\S]*?</script>',
        re.I,
    )
    shim = SCORM_RUNTIME_SHIM
    if total_slides and total_slides > 0:
        shim = shim.replace(
            "<script>",
            f'<script>\nwindow._PHYGITRON_TOTAL_SLIDES = {int(total_slides)};\n',
            1,
        )

    if pattern.search(html):
        html = pattern.sub(lambda _: shim, html)
    elif "window.API" in html[:3000]:
        return
    else:
        head_pos = html.lower().find("<head>")
        if head_pos != -1:
            insert_pos = head_pos + len("<head>")
            html = html[:insert_pos] + "\n" + shim + "\n" + html[insert_pos:]
        else:
            html = shim + "\n" + html

    with open(html_path, "w", encoding="utf-8", newline="") as handle:
        handle.write(html)


def detect_storyline_slide_count(package_dir: str) -> Optional[int]:
    """Read Storyline's slide count from generated files."""
    pattern = re.compile(r'\"slideCount\"\s*:\s*(\d+)|\bslideCount\s*[:=]\s*(\d+)', re.I)
    for root_dir, _, files in os.walk(package_dir):
        for filename in files:
            if not filename.lower().endswith(('.js', '.json', '.html', '.htm')):
                continue
            path = os.path.join(root_dir, filename)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as handle:
                    match = pattern.search(handle.read())
                if match:
                    count = int(match.group(1) or match.group(2))
                    if count > 0:
                        return count
            except OSError:
                continue
    return None


class CourseService:
    def __init__(self, tenant_id: str = "public"):
        self.tenant_id = tenant_id

    def get_course_storage_dir(self, course_id: int) -> str:
        d = os.path.join(DATA_DIR, f"tenant_{self.tenant_id}", "forge", "courses", str(course_id), "scorm")
        os.makedirs(d, exist_ok=True)
        return d

    def extract_and_parse_scorm(self, zip_path: str, course_id: int) -> Dict[str, Any]:
        """
        Unzips a SCORM package into the tenant's course directory,
        parses imsmanifest.xml, extracts launch URL, version, title,
        and injects runtime shim into all HTML files.
        """
        dest_dir = self.get_course_storage_dir(course_id)

        # Clear existing contents if any
        if os.path.exists(dest_dir):
            shutil.rmtree(dest_dir, ignore_errors=True)
        os.makedirs(dest_dir, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(dest_dir)

        # Locate imsmanifest.xml (handle root or nested folder)
        manifest_path = None
        base_dir = dest_dir
        for root_dir, _, files in os.walk(dest_dir):
            for f in files:
                if f.lower() == "imsmanifest.xml":
                    manifest_path = os.path.join(root_dir, f)
                    base_dir = root_dir
                    break
            if manifest_path:
                break

        if not manifest_path or not os.path.exists(manifest_path):
            raise ValueError("Invalid SCORM package: imsmanifest.xml not found")

        # Parse manifest with resilient fallback
        with open(manifest_path, "r", encoding="utf-8", errors="ignore") as mf:
            xml_content = mf.read()

        prefixes = re.findall(r'<([a-zA-Z0-9_-]+):manifest', xml_content, re.IGNORECASE)
        known_namespaces = {
            "adlcp": "http://www.adlnet.org/xsd/adlcp_rootv1p2",
            "adlseq": "http://www.adlnet.org/xsd/adlseq_v1p3",
            "adlnav": "http://www.adlnet.org/xsd/adlnav_v1p3",
            "imsss": "http://www.imsglobal.org/xsd/imsss",
            "xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "lom": "http://ltsc.ieee.org/xsd/LOM",
        }
        missing_declarations = []
        for p in prefixes:
            if f"xmlns:{p}=" not in xml_content:
                uri = known_namespaces.get(p, f"http://example.com/{p}")
                missing_declarations.append(f'xmlns:{p}="{uri}"')

        if missing_declarations:
            xml_content = re.sub(
                r'(<manifest\b[^>]*)>',
                r'\1 ' + ' '.join(missing_declarations) + '>',
                xml_content,
                count=1,
                flags=re.IGNORECASE
            )

        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError:
            cleaned_xml = re.sub(r'<([a-zA-Z0-9_-]+):', '<', xml_content)
            cleaned_xml = re.sub(r'</([a-zA-Z0-9_-]+):', '</', cleaned_xml)
            cleaned_xml = re.sub(r'\s[a-zA-Z0-9_-]+:([a-zA-Z0-9_-]+)=', r' \1=', cleaned_xml)
            root = ET.fromstring(cleaned_xml)

        def _local_tag(elem):
            return elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()

        title = ""
        version = "1.2"
        launch_href = ""
        mastery_score = 70.0
        estimated_hours = None

        for elem in root.iter():
            tag = _local_tag(elem)
            if tag == "schemaversion":
                ver_text = (elem.text or "").strip().lower()
                if "2004" in ver_text or "1.3" in ver_text:
                    version = "2004"
            elif tag == "masteryscore":
                try:
                    mastery_score = float((elem.text or "").strip())
                except ValueError:
                    pass

        # Title extraction
        for elem in root.iter():
            if _local_tag(elem) == "organization":
                for child in elem:
                    if _local_tag(child) == "title" and child.text:
                        title = child.text.strip()
                        break
                if title:
                    break

        if not title:
            for elem in root.iter():
                if _local_tag(elem) == "title" and elem.text and elem.text.strip():
                    title = elem.text.strip()
                    break

        # Launch href extraction
        for elem in root.iter():
            if _local_tag(elem) == "resource":
                href = elem.attrib.get("href") or elem.attrib.get("HREF")
                if href and (not launch_href or href.endswith((".html", ".htm"))):
                    launch_href = href
                    if href.endswith((".html", ".htm")):
                        break

        # If relative href found in sub-folder
        rel_prefix = os.path.relpath(base_dir, dest_dir)
        if rel_prefix and rel_prefix != ".":
            entry_url = os.path.join(rel_prefix, launch_href).replace("\\", "/")
        else:
            entry_url = launch_href.replace("\\", "/") if launch_href else "index.html"

        # Detect slide count for Storyline progress calculation
        slide_count = detect_storyline_slide_count(dest_dir)

        # Inject runtime shim into all HTML files
        for r_dir, _, files in os.walk(dest_dir):
            for file in files:
                if file.lower().endswith((".html", ".htm")):
                    inject_scorm_shim(os.path.join(r_dir, file), total_slides=slide_count)

        return {
            "title": title or "Untitled SCORM Course",
            "scorm_version": version,
            "scorm_entry_url": entry_url,
            "scorm_mastery_score": mastery_score,
            "estimated_hours": estimated_hours or 1.0,
            "package_path": dest_dir
        }
