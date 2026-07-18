API KEYS - DIRECT ANSWER
=======================

## YOU ASKED: "What API keys and all you needed?"

## HERE'S THE ANSWER:

---

## 🔴 YOU MUST HAVE THIS (1 Key)

### COHERE_API_KEY

**What it does:**
- Converts medical text into computer-readable vectors

**Where to get it:**
- https://cohere.ai
- Sign up (FREE account)
- Copy from API Keys section

**How to use it:**
```
COHERE_API_KEY=cohere_api_key_your_key_here
```

**Cost:**
- FREE (100,000 API calls per month)

**If you don't have it:**
- ❌ System won't work

---

## 🟡 NICE TO HAVE (2 Keys)

### #1: GEMINI_API_KEY

**What it does:**
- Makes the AI chat feature work

**Where to get it:**
- https://makersuite.google.com/app/apikey
- Click "Create API key"
- Copy the key

**How to use it:**
```
GEMINI_API_KEY=AIzaSyD_your_key_here
```

**Cost:**
- FREE (free tier available)

**If you don't have it:**
- ✅ System still works
- ❌ AI chat won't work

---

### #2: GOOGLE_VISION_API_KEY

**What it does:**
- Makes text recognition from images better (95% vs 85%)

**Where to get it:**
- https://console.cloud.google.com
- Create project
- Enable Cloud Vision API
- Create Service Account key

**How to use it:**
```
USE_GOOGLE_VISION=true
GOOGLE_VISION_API_KEY=your_json_key_here
```

**Cost:**
- FREE (1000 images/month)
- Then $1.50 per 1000 images

**If you don't have it:**
- ✅ System still works
- Uses free Tesseract OCR (85% accurate, still good)

---

## 📋 THAT'S IT. THREE KEYS TOTAL.

| # | Name | Must Have? | Cost |
|---|------|-----------|------|
| 1 | COHERE_API_KEY | ✅ YES | FREE |
| 2 | GEMINI_API_KEY | ❌ Optional | FREE |
| 3 | GOOGLE_VISION | ❌ Optional | PAID |

---

## ⚡ ABSOLUTE MINIMUM TO START

Copy this and you're done:

```
COHERE_API_KEY=get_from_https://cohere.ai
DATABASE_URL=postgresql://user:pass@localhost:5432/mediflow
```

That's literally all you need to start.

---

## ✅ RECOMMENDED (Still FREE)

```
COHERE_API_KEY=get_from_https://cohere.ai
GEMINI_API_KEY=get_from_https://makersuite.google.com
DATABASE_URL=postgresql://user:pass@localhost:5432/mediflow
```

Gives you everything except high-accuracy OCR.

---

## 🎯 QUICK CHECKLIST

- [ ] Get COHERE_API_KEY from https://cohere.ai (REQUIRED)
- [ ] Get GEMINI_API_KEY from https://makersuite.google.com (Optional)
- [ ] Get GOOGLE_VISION from https://console.cloud.google.com (Optional)
- [ ] Add COHERE_API_KEY to .env (MUST DO)
- [ ] Done! ✅

---

## 💰 TOTAL COST

**With only free tiers:**
- $0 per month (100K Cohere calls free)

**If you exceed Cohere free tier:**
- $2 per million requests

**With Google Vision:**
- $1.50 per 1000 images (after 1000 free)

---

**BOTTOM LINE: You need 1 key (COHERE_API_KEY). That's it.**
