# 🎯 First Day Onboarding - Get Started in 30 Minutes

**Welcome to HGNC WebApp!** This checklist will get you productive in your first 30 minutes. Do these 5 things in order.

---

## ✅ Checklist: Your First 30 Minutes

### Step 1: Read the Critical Rules (5 minutes)
**File:** [`START_HERE.md`](./START_HERE.md)

**Why:** These 4 rules prevent wasting hours on common mistakes

**What you'll learn:**
- How CSS cascade can trick you
- Why deployment URLs matter
- How hard refresh saves debugging time
- How to test CSS changes properly

**Time:** 5 minutes | **Importance:** ⭐⭐⭐ CRITICAL

---

### Step 2: Clone and Run Locally (5 minutes)
**Do this:**
```bash
# Clone the repo
git clone <repo-url>
cd hgnc-webapp

# Install dependencies
npm install

# View the code
code .
```

**What you'll see:**
- `src/` - All code (JS, CSS, HTML templates)
- `docs/` - 80+ documentation files
- `scripts/` - Deployment and test utilities
- `tests/` - Test files
- `Code.js` - Google Apps Script server code

**Time:** 5 minutes | **Importance:** ⭐⭐⭐

---

### Step 3: Quick Reference Card (10 minutes)
**File:** [`QUICK_REFERENCE.md`](./getting-started/QUICK_REFERENCE.md)

**Why:** Keep this open when you code - answers 80% of common questions

**Topics covered:**
- Deployment commands
- File structure quick facts
- Key view IDs
- Common patterns
- Testing basics
- How to report bugs

**Time:** 10 minutes | **Importance:** ⭐⭐⭐ ESSENTIAL - BOOKMARK THIS

---

### Step 4: Development Principles (5 minutes - Skim Only)
**File:** [`DEVELOPMENT-PRINCIPLES.md`](./getting-started/DEVELOPMENT-PRINCIPLES.md)

**Important sections to scan:**
- Non-negotiable patterns (section 2)
- Code review checklist (section 6)
- Bookmark for detailed reading later

**Full read:** Save for Week 1 (30 min)

**Time:** 5 minutes | **Importance:** ⭐⭐

---

### Step 5: Ask Questions & Find Your Mentor (5 minutes)
**Do this:**
1. Introduce yourself to the team
2. Ask one question about the codebase
3. Find someone to help you with next task
4. Bookmark [`DOCUMENTATION_INDEX.md`](./DOCUMENTATION_INDEX.md) for later help

**Time:** 5 minutes

---

## ✅ After This Checklist

**Congratulations!** You now understand:
- ✅ Critical deployment rules (START_HERE.md)
- ✅ Project structure (Step 2 - exploration)
- ✅ Where to find quick answers (QUICK_REFERENCE.md)
- ✅ Development patterns (brief overview)
- ✅ Who to ask for help

**You're ready to:**
- ❌ NOT deploy yet - read DEPLOYMENT_CHECKLIST.md first
- ✅ Read code and understand patterns
- ✅ Make small non-critical changes
- ✅ Run tests locally
- ✅ Ask good questions

---

## 📚 Week 1 Reading List

After you complete the first-day checklist, read these **in order** (about 2 hours total):

1. **Monday:** [DEVELOPMENT-PRINCIPLES.md](./getting-started/DEVELOPMENT-PRINCIPLES.md) (full read - 30 min)
2. **Tuesday:** [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) (20 min - learn from past mistakes)
3. **Wednesday:** [PROJECT_STATUS_SUMMARY.md](./operations/PROJECT_STATUS_SUMMARY.md) (30 min - understand full scope)
4. **Thursday:** [TESTING_README.md](./testing/TESTING_README.md) (15 min - how to test)
5. **Friday:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) (15 min - prepare to deploy)

**After Week 1 reading, you'll be ready to:**
- ✅ Write code confidently
- ✅ Make CSS changes safely
- ✅ Review test results
- ✅ Deploy with confidence
- ✅ Debug complex issues

---

## 🆘 If You Get Stuck

**First:** Check [QUICK_FIX_GUIDE.md](./QUICK_FIX_GUIDE.md) - 10 common issues & solutions

**Second:** Check [DEBUGGING_STRATEGY.md](./operations/DEBUGGING_STRATEGY.md) - systematic debugging approach

**Third:** Ask your mentor - that's what they're here for!

**Last:** Check [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - navigate all 80+ docs

---

## 🎯 Your First Real Task

Once you've completed the Week 1 reading:

1. **Pick a small bug or feature** from the team
2. **Before coding:**
   - Read relevant sections of DEVELOPMENT-PRINCIPLES.md
   - Search LESSONS_LEARNED.md for similar problems
   - Check QUICK_FIX_GUIDE.md for known issues

3. **While coding:**
   - Reference QUICK_REFERENCE.md for commands
   - Check TESTING_README.md for how to test
   - Ask questions!

4. **Before deploying:**
   - Read DEPLOYMENT_CHECKLIST.md completely
   - Run tests: `./scripts/test-all.sh`
   - Get code review from team member
   - Use production deployment URL (check DEPLOYMENT_URLS.md)

5. **After deploying:**
   - Tell users to hard refresh: `Cmd+Shift+R`
   - Document what you learned in LESSONS_LEARNED.md
   - Celebrate your first deployment! 🎉

---

## 📞 Quick Links

| Need? | Document | Read Time |
|-------|----------|-----------|
| Quick answer | [QUICK_REFERENCE.md](./getting-started/QUICK_REFERENCE.md) | 2 min |
| I have an error | [QUICK_FIX_GUIDE.md](./QUICK_FIX_GUIDE.md) | 5 min |
| How to code here | [DEVELOPMENT-PRINCIPLES.md](./getting-started/DEVELOPMENT-PRINCIPLES.md) | 30 min |
| Why this happened | [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) | 20 min |
| How to deploy | [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | 15 min |
| How to debug | [DEBUGGING_STRATEGY.md](./operations/DEBUGGING_STRATEGY.md) | 20 min |
| How to test | [TESTING_README.md](./testing/TESTING_README.md) | 15 min |
| Everything else | [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) | browse |

---

## ⏱️ Time Breakdown

- **Step 1** (START_HERE.md): 5 min
- **Step 2** (Clone & explore): 5 min
- **Step 3** (QUICK_REFERENCE.md): 10 min
- **Step 4** (DEVELOPMENT-PRINCIPLES skim): 5 min
- **Step 5** (Team & questions): 5 min
- **TOTAL:** 30 minutes ✅

---

## 🎓 Success Criteria

You've completed onboarding when you can answer:

- [ ] What are the 4 critical rules in START_HERE.md?
- [ ] Where is QUICK_REFERENCE.md and what's it for?
- [ ] What's the project structure (3 main folders)?
- [ ] How do you run tests?
- [ ] Where do you find deployment commands?
- [ ] What does a hard refresh do?
- [ ] Where do you find answers to common questions?
- [ ] Who's your mentor for complex questions?

**All yes?** You're ready! Welcome aboard! 🚀

---

**Last Updated:** December 11, 2025  
**For full documentation:** [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
