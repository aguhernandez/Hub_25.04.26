# 🍎 USDA Foods Integration Guide

Complete guide to load nutritious foods with micronutrients from USDA FoodData Central API.

---

## 📋 Prerequisites

### 1. Get USDA API Key (FREE)

1. Go to https://fdc.nal.usda.gov/api-key-signup.html
2. Fill the form with your email
3. You'll receive the API key instantly by email
4. **Limits:** 1,000 requests/hour (more than enough)

### 2. Add to .env File

```bash
# Add this line to your .env file
USDA_API_KEY=your_actual_api_key_here
```

**Example:**
```bash
USDA_API_KEY=abcd1234efgh5678ijkl9012mnop3456qrst7890
```

---

## 🚀 Quick Start

### Step 1: Install (if needed)
```bash
npm install
```

### Step 2: Run the Import Script
```bash
node load-usda-foods.js
```

### Step 3: Watch the Magic ✨
The script will:
- Fetch 32 common foods from USDA
- Extract ALL nutrients (macros + micros)
- Translate names to Spanish
- Insert into your database
- Show progress in real-time

---

## 📊 What Gets Loaded

### Foods Included (32 total):

#### Proteins (8)
- Chicken breast
- Salmon
- Tuna
- Eggs
- Ground beef (90% lean)
- Greek yogurt
- Milk (2%)
- Cheddar cheese

#### Grains (5)
- Brown rice
- Oats
- Quinoa
- Whole wheat bread
- Whole wheat pasta

#### Fruits (5)
- Bananas
- Apples
- Oranges
- Strawberries
- Blueberries

#### Vegetables (6)
- Broccoli
- Spinach
- Sweet potato
- Carrots
- Tomatoes
- Red peppers

#### Nuts & Seeds (4)
- Almonds
- Walnuts
- Peanut butter
- Chia seeds

#### Legumes (3)
- Black beans
- Chickpeas
- Lentils

#### Fats (2)
- Olive oil
- Avocado

---

## 💊 Nutrients Extracted

### Macronutrients
- ✅ Calories
- ✅ Protein
- ✅ Carbohydrates
- ✅ Fat
- ✅ Fiber
- ✅ Sugar

### Vitamins
- ✅ Vitamin A (RAE)
- ✅ Vitamin B1 (Thiamin)
- ✅ Vitamin B2 (Riboflavin)
- ✅ Vitamin B3 (Niacin)
- ✅ Vitamin B6
- ✅ Vitamin B12
- ✅ Vitamin C
- ✅ Vitamin D
- ✅ Vitamin E
- ✅ Vitamin K
- ✅ Folate

### Minerals
- ✅ Calcium
- ✅ Iron
- ✅ Magnesium
- ✅ Phosphorus
- ✅ Potassium
- ✅ Sodium
- ✅ Zinc

**Total: 24 nutrients per food!**

---

## 🔄 What About Existing Foods?

You have 2 options:

### Option 1: Keep Existing Foods (DEFAULT - SAFE)
```javascript
// In load-usda-foods.js, line 195
const deleteExisting = false; // Current setting
```

**Result:**
- Your 16 existing foods stay
- 32 USDA foods are added
- Total: 48 foods

**Pros:**
- Safe - no data loss
- Existing meal plans keep working
- More variety

**Cons:**
- Some duplicates (e.g., 2 chickens, 2 bananas)
- Existing foods still have no micronutrients

---

### Option 2: Delete & Replace (CLEAN START)
```javascript
// In load-usda-foods.js, line 195
const deleteExisting = true; // Change to true
```

**Result:**
- All existing foods deleted
- 32 USDA foods loaded
- Total: 32 foods (clean)

**Pros:**
- Clean database
- All foods have complete data
- No duplicates

**Cons:**
- ⚠️ Existing meal plans will break!
- Athletes will need to recreate plans

---

## 📝 Example Output

```bash
🚀 Starting USDA food import...

📊 Found 16 existing foods in database
⚠️  These foods have no micronutrient data

Options:
1. Delete all existing foods and load USDA foods (RECOMMENDED)
2. Keep existing foods and add USDA foods
3. Cancel

📥 Fetching: Chicken, broiler, breast, skinless, boneless, meat only, raw...
✅ Inserted: Chicken, broiler, breast, skinless, boneless, meat only, raw (Pollo, broiler, pechuga, skinless, boneless, meat only, crudo)
   📊 165 kcal | P:31g | C:0g | F:3.6g
   💊 Ca:15mg | Fe:1.04mg | VitC:0mg

📥 Fetching: Fish, salmon, Atlantic, wild, raw...
✅ Inserted: Fish, salmon, Atlantic, wild, raw (Pescado, salmón, Atlantic, wild, crudo)
   📊 142 kcal | P:19.8g | C:0g | F:6.3g
   💊 Ca:12mg | Fe:0.8mg | VitC:0mg

...

✨ Import Complete!
✅ Success: 32 foods
❌ Failed: 0 foods
```

---

## 🎯 Recommended Workflow

### For New Projects:
```bash
# Delete existing, load USDA
# Edit line 195 in load-usda-foods.js:
const deleteExisting = true;

# Run
node load-usda-foods.js
```

### For Projects with Existing Data:
```bash
# Keep existing, add USDA
# Edit line 195 in load-usda-foods.js:
const deleteExisting = false;

# Run
node load-usda-foods.js

# Later, manually delete duplicates in Supabase dashboard
```

---

## 🔧 Customization

### Add More Foods

1. Find food on USDA: https://fdc.nal.usda.gov/
2. Get the FDC ID (number in URL)
3. Add to `COMMON_FOODS` array in script:

```javascript
{
  fdcId: 123456,
  category: 'meat',
  searchName: 'Your food name'
},
```

### Change Categories
Available categories:
- `meat`
- `fish`
- `egg`
- `dairy`
- `grain`
- `fruit`
- `vegetable`
- `nuts`
- `legume`
- `fat`

---

## 🐛 Troubleshooting

### Error: USDA_API_KEY not found
**Solution:** Add `USDA_API_KEY=your_key` to `.env` file

### Error: fetch failed
**Solutions:**
- Check internet connection
- Verify API key is correct
- Wait 1 hour (rate limit)

### Error: duplicate key value
**Solution:** Food already exists. Either:
- Skip it (continue)
- Delete existing food first
- Change food name

### Spanish translations are weird
**Solution:** Edit `translateName()` function to add/fix translations

---

## 📈 After Import

### Check Your Data
```sql
-- In Supabase SQL Editor
SELECT
  name_en,
  calories_per_100g,
  protein_per_100g,
  calcium_mg,
  vitamin_c_mg
FROM foods
WHERE calcium_mg IS NOT NULL
LIMIT 10;
```

### Test in App
1. Go to Nutrition > Meals
2. Add a food to a meal
3. Check the Micronutrients sidebar
4. You should see real data now! 🎉

---

## 🌟 Pro Tips

### Tip 1: Load in Batches
If you want 100+ foods:
- Split into multiple runs
- Avoid rate limits
- 30-50 foods per run is safe

### Tip 2: Custom Food Database
You can adapt this script for:
- Local food databases (Argentina, Spain, etc.)
- Restaurant chains (McDonald's, etc.)
- Your own recipes

### Tip 3: Update Existing Foods
```javascript
// Instead of .insert(), use .upsert()
const { error } = await supabase
  .from('foods')
  .upsert(foodRecord, { onConflict: 'usda_fdc_id' });
```

---

## 📚 Resources

- **USDA FoodData Central:** https://fdc.nal.usda.gov/
- **API Documentation:** https://fdc.nal.usda.gov/api-guide.html
- **Nutrient List:** https://fdc.nal.usda.gov/nutrient-list.html
- **Food Search:** https://fdc.nal.usda.gov/fdc-app.html

---

## ✅ Success Checklist

- [ ] USDA API key obtained
- [ ] API key added to .env
- [ ] Script decision made (delete existing or not)
- [ ] Script run successfully
- [ ] Foods visible in Supabase dashboard
- [ ] Micronutrients showing in app
- [ ] Athletes can create meal plans
- [ ] Sidebar shows real vitamin/mineral data

---

## 🎉 Done!

Your nutrition app now has:
- ✅ Real food data from official source
- ✅ Complete micronutrient profiles
- ✅ 24 nutrients per food
- ✅ Spanish + English names
- ✅ Professional nutrition tracking

**Next Steps:**
- Load more foods as needed
- Share with athletes
- Start tracking nutrition properly! 💪

---

**Questions? Issues?**
Check the console output for detailed error messages.
