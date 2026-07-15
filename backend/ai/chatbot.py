import sys
import os
import json

def load_env_fallback():
    if not os.environ.get("GEMINI_API_KEY"):
        for path_to_check in [os.path.join("..", ".env"), os.path.join("..", "..", ".env"), ".env"]:
            if os.path.exists(path_to_check):
                try:
                    with open(path_to_check, "r") as f:
                        for line in f:
                            if line.strip() and not line.startswith("#"):
                                key, val = line.strip().split("=", 1)
                                if key.strip() == "GEMINI_API_KEY":
                                    os.environ["GEMINI_API_KEY"] = val.strip().strip('"').strip("'")
                                    break
                except Exception:
                    pass

def run_local_chatbot(message, items):
    msg_lower = message.lower()
    matched_ids = []
    matches = []
    
    # Tokenize message
    tokens = [w for w in msg_lower.replace(",", "").replace(".", "").replace("?", "").split() if len(w) > 2]
    
    # Simple rule-based scorer
    for item in items:
        score = 0
        title = item.get("title", "").lower()
        desc = item.get("description", "").lower()
        loc = item.get("location", "").lower()
        cat = item.get("category", "").lower()
        
        for token in tokens:
            if token in title: score += 3
            if token in desc: score += 1
            if token in loc: score += 2
            if token in cat: score += 2
            
        if score > 2:
            matches.append((item, score))
            
    # Sort matches by score desc
    matches.sort(key=lambda x: x[1], reverse=True)
    
    if matches:
        top_item = matches[0][0]
        matched_ids = [m[0]["id"] for m in matches]
        
        reply = (
            f"Hi there! I searched our found items database and I found a potential match: "
            f"**{top_item.get('title')}** was found at **{top_item.get('location')}** on **{top_item.get('date')}**.\n\n"
            f"If this belongs to you, click on it to submit an ownership claim request!"
        )
        if len(matches) > 1:
            reply += f" I also found {len(matches) - 1} other possible matching item(s)."
    else:
        reply = (
            "Hello! I couldn't find any items matching your description in our active database of found belongings. "
            "I recommend submitting a **Lost Item Report** via the portal. "
            "If someone hands in an item matching your description, the system will automatically notify you!"
        )
        
    return {
        "reply": reply,
        "matchIds": matched_ids
    }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"reply": "I need a message and items list to work.", "matchIds": []}))
        return

    message = sys.argv[1]
    items_json = sys.argv[2]

    try:
        items = json.loads(items_json)
    except Exception:
        items = []

    load_env_fallback()
    api_key = os.environ.get("GEMINI_API_KEY")

    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            model = genai.GenerativeModel(model_name="gemini-2.5-flash")
            
            prompt = (
                "You are an AI assistant for a college Campus Lost and Found portal.\n"
                f"A student says: \"{message}\"\n\n"
                f"Here is the JSON list of active found items currently in the college office:\n{json.dumps(items)}\n\n"
                "Analyze the request. If any found items match what the user is looking for (e.g. correct category, color, name, location, brand), suggest it.\n"
                "Format your response as a strict JSON object containing EXACTLY two fields:\n"
                "1. \"reply\": A natural, helpful, friendly response explaining what matches were found or suggesting next steps (use markdown bold/bullet points if needed).\n"
                "2. \"matchIds\": An array of strings representing the IDs of the matching items you identified.\n"
                "Return ONLY the raw JSON object. Do not include markdown code block syntax (like ```json). Do not include any other text."
            )
            
            response = model.generate_content(prompt)
            resp_text = response.text.strip()
            
            # Clean possible markdown block wraps
            if resp_text.startswith("```"):
                resp_text = resp_text.split("```")[1]
                if resp_text.startswith("json"):
                    resp_text = resp_text[4:]
            resp_text = resp_text.strip()
            
            # Verify it parses as JSON
            result = json.loads(resp_text)
            print(json.dumps(result))
            return
        except Exception as e:
            # Fall back if API call fails
            pass

    # Fall back to keyword matcher
    local_result = run_local_chatbot(message, items)
    print(json.dumps(local_result))

if __name__ == "__main__":
    main()
