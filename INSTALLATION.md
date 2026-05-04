# Installation Instructions for Corrected Files

## Quick Installation

Replace these 2 files in your simulator:

1. **engine.py** → Replace `backend/simulation/engine.py`
2. **damper.py** → Replace `backend/structures/damper.py`

That's it! All bugs are now fixed.

---

## Step-by-Step Installation

### Option 1: From Command Line
```bash
# Navigate to your simulator directory
cd your-simulator-directory

# Backup original files (optional but recommended)
cp backend/simulation/engine.py backend/simulation/engine.py.backup
cp backend/structures/damper.py backend/structures/damper.py.backup

# Copy the corrected files
cp /path/to/corrected-files/engine.py backend/simulation/
cp /path/to/corrected-files/damper.py backend/structures/
```

### Option 2: Manual Copy
1. Open your simulator folder
2. Navigate to `backend/simulation/`
3. Replace `engine.py` with the corrected version
4. Navigate to `backend/structures/`
5. Replace `damper.py` with the corrected version

---

## What Was Fixed

### In `engine.py`:
- **Lines 100-105**: Fixed earthquake force application (buildings now vibrate)
- **Lines 106-113**: Fixed damper state updates (added velocity parameter)
- **Lines 173-188**: Fixed AI control commands (safe dictionary access)

### In `damper.py`:
- **Line 46**: Added energy tracking variable
- **Lines 56-71**: Fixed force computation (added building velocity parameter)
- **Lines 73-115**: Fixed state integration (complete physics with displacement & velocity)
- **Lines 115-125**: Fixed energy reporting (accumulated instead of instantaneous)

---

## Verification

After replacing the files, test that everything works:

### Test 1: Earthquake Vibration
1. Start simulator
2. Click "Trigger Earthquake"
3. **Expected**: Buildings shake visibly (5-20cm displacement)

### Test 2: Passive Damping
1. Enable "Passive" damping mode
2. Trigger earthquake
3. **Expected**: Vibration reduced by 40-60%

### Test 3: Adaptive Damping
1. Enable "Adaptive" damping mode
2. Trigger earthquake
3. **Expected**: AI learns frequency, vibration reduced by 60-80%

---

## File Locations in Your Simulator

```
your-simulator/
├── backend/
│   ├── simulation/
│   │   ├── engine.py          ← REPLACE THIS FILE
│   │   ├── integrator.py
│   │   └── excitation.py
│   └── structures/
│       ├── building.py
│       └── damper.py          ← REPLACE THIS FILE
└── frontend/
    └── ...
```

---

## No Other Changes Needed

✅ All other files remain unchanged  
✅ No database migrations needed  
✅ No configuration changes required  
✅ No dependency updates needed  

Just replace these 2 files and restart the simulator!

---

## Troubleshooting

**Problem**: Import errors after replacing files  
**Solution**: Make sure files are in the correct directories:
- `engine.py` in `backend/simulation/`
- `damper.py` in `backend/structures/`

**Problem**: Simulator won't start  
**Solution**: Check Python syntax with: `python -m py_compile engine.py`

**Problem**: Still seeing old behavior  
**Solution**: 
1. Restart the backend server completely
2. Clear browser cache
3. Verify you replaced the correct files

---

## Support

If issues persist:
1. Check that you're using Python 3.8+
2. Verify all dependencies are installed
3. Make sure you replaced both files (not just one)
4. Restart both backend and frontend

---

**That's it! Your simulator should now work perfectly.** 🎉

Buildings will vibrate during earthquakes, and both passive and active damping will reduce vibrations as intended.
