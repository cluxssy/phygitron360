import unittest
from backend.modules.source.services.candidate_search_parser import parse_search_query, parse_search_query_rule_based

class TestCandidateSearchParser(unittest.TestCase):
    def test_btech_not_in_wipro(self):
        parsed = parse_search_query_rule_based("btech not in wipro")
        self.assertIn("btech", parsed["degrees"])
        self.assertIn("b.tech", parsed["degrees"])
        self.assertIn("wipro", parsed["exclude_companies"])
        self.assertIn("wipro", parsed["exclude_terms"])

    def test_multi_company_exclusion(self):
        parsed = parse_search_query_rule_based("react developer without wipro, infosys or tcs")
        self.assertIn("wipro", parsed["exclude_companies"])
        self.assertIn("infosys", parsed["exclude_companies"])
        self.assertIn("tcs", parsed["exclude_companies"])
        self.assertIn("react", parsed["general_terms"])

    def test_degree_and_institution(self):
        parsed = parse_search_query_rule_based("iit btech python not in accenture")
        self.assertIn("iit", parsed["institutions"])
        self.assertIn("btech", parsed["degrees"])
        self.assertIn("accenture", parsed["exclude_companies"])
        self.assertIn("python", parsed["general_terms"])

    def test_experience_extraction(self):
        parsed = parse_search_query_rule_based("golang 4+ years exp not at capgemini")
        self.assertEqual(parsed["min_exp"], 4.0)
        self.assertIn("capgemini", parsed["exclude_companies"])
        self.assertIn("golang", parsed["general_terms"])

    def test_simple_keyword_query(self):
        parsed = parse_search_query_rule_based("frontend engineer")
        self.assertFalse(parsed["is_complex"])
        self.assertEqual(len(parsed["exclude_companies"]), 0)
        self.assertIn("frontend", parsed["general_terms"])

if __name__ == "__main__":
    unittest.main()
