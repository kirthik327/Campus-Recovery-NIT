import sys
import os
import json

# Try to import OpenCV and NumPy
OPENCV_AVAILABLE = False
try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
    pass

def calculate_opencv_similarity(target_path, candidate_path):
    if not OPENCV_AVAILABLE:
        return 0.0
    
    try:
        # Load images
        img1 = cv2.imread(target_path)
        img2 = cv2.imread(candidate_path)
        
        if img1 is None or img2 is None:
            return 0.0

        # Resize to same size for comparison
        img1 = cv2.resize(img1, (256, 256))
        img2 = cv2.resize(img2, (256, 256))

        # Convert to HSV color space
        hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
        hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)

        # Calculate HSV color histogram
        hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])

        # Normalize histograms
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)

        # Compare histograms using Correlation method
        color_sim = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        
        # Keep similarity in range [0, 1]
        color_sim = max(0.0, min(1.0, color_sim))

        # Add SIFT or ORB feature matching for shape overlap
        orb = cv2.ORB_create(nfeatures=500)
        kp1, des1 = orb.detectAndCompute(img1, None)
        kp2, des2 = orb.detectAndCompute(img2, None)

        shape_sim = 0.0
        if des1 is not None and des2 is not None:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = bf.match(des1, des2)
            
            # Simple score: matches count relative to total descriptors
            match_ratio = len(matches) / max(len(des1), len(des2), 1)
            shape_sim = min(1.0, match_ratio * 4) # amplify for better weights

        # Combine: 70% color similarity, 30% shape similarity
        combined_sim = (0.7 * color_sim) + (0.3 * shape_sim)
        return float(combined_sim)
    except Exception as e:
        # Fail silently and return 0
        return 0.0

def main():
    if len(sys.argv) < 3:
        print(json.dumps([]))
        return

    target_img_path = sys.argv[1]
    candidates_json = sys.argv[2]

    try:
        candidates = json.loads(candidates_json)
    except Exception:
        print(json.dumps([]))
        return

    if not os.path.exists(target_img_path):
        print(json.dumps([]))
        return

    results = []
    
    for cand in candidates:
        cand_id = cand.get("id")
        cand_rel_img = cand.get("image")
        
        # Reconstruct absolute path
        # Assuming cand_rel_img is like '/uploads/file.png', target is in backend root
        cand_img_path = "." + cand_rel_img
        
        score = 0.0
        
        if os.path.exists(cand_img_path):
            if OPENCV_AVAILABLE:
                score = calculate_opencv_similarity(target_img_path, cand_img_path)
            else:
                # Local Pillow-based fallback if OpenCV is not installed
                try:
                    from PIL import Image
                    t_img = Image.open(target_img_path).resize((100, 100))
                    c_img = Image.open(cand_img_path).resize((100, 100))
                    
                    # Compute mean color distance
                    t_data = list(t_img.getdata())
                    c_data = list(c_img.getdata())
                    
                    diffs = []
                    for i in range(len(t_data)):
                        # handles RGB or RGBA
                        t_px = t_data[i][:3]
                        c_px = c_data[i][:3]
                        diff = sum(abs(a - b) for a, b in zip(t_px, c_px))
                        diffs.append(diff)
                    
                    avg_diff = sum(diffs) / len(diffs)
                    # Normalize: max diff is 255 * 3 = 765
                    score = 1.0 - (avg_diff / 765.0)
                except Exception:
                    score = 0.1
        
        # Add metadata adjustments (simulating multi-modal context)
        # Check filenames matching
        target_name = os.path.basename(target_img_path).lower()
        cand_name = os.path.basename(cand_img_path).lower()
        target_words = target_name.replace(".", " ").replace("_", " ").replace("-", " ").split()
        cand_words = cand_name.replace(".", " ").replace("_", " ").replace("-", " ").split()
        
        intersection = [w for w in target_words if w in cand_words and len(w) > 2]
        if intersection:
            score = min(0.98, score + 0.25)
            
        results.append({
            "id": cand_id,
            "score": round(max(0.1, score), 3)
        })

    # Sort matches by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    print(json.dumps(results))

if __name__ == "__main__":
    main()
