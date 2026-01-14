# Manual E2E Testing Commands

Open Chrome DevTools on the running Electron app and run these commands in the console:

## Test 1: Check APIs Exist

```javascript
console.log('Planning API:', typeof window.electronAPI.planning);
console.log('VAC API:', typeof window.electronAPI.vac);
console.log('Learning API:', typeof window.electronAPI.learning);
```

Expected output: All should show `object`

## Test 2: Check Planning Methods

```javascript
const planning = window.electronAPI.planning;
console.log('startIntake:', typeof planning.startIntake);
console.log('submitAnswers:', typeof planning.submitAnswers);
console.log('getQuestions:', typeof planning.getQuestions);
console.log('startResearch:', typeof planning.startResearch);
console.log('generatePlan:', typeof planning.generatePlan);
```

Expected output: All should show `function`

## Test 3: Check VAC Methods

```javascript
const vac = window.electronAPI.vac;
console.log('getAllContracts:', typeof vac.getAllContracts);
console.log('getContract:', typeof vac.getContract);
console.log('runVerification:', typeof vac.runVerification);
console.log('checkDrift:', typeof vac.checkDrift);
console.log('compareAST:', typeof vac.compareAST);
```

Expected output: All should show `function`

## Test 4: Check Learning Methods

```javascript
const learning = window.electronAPI.learning;
console.log('getDecisionHistory:', typeof learning.getDecisionHistory);
console.log('getPatterns:', typeof learning.getPatterns);
console.log('getLearningAnalytics:', typeof learning.getLearningAnalytics);
console.log('getMethodEffectiveness:', typeof learning.getMethodEffectiveness);
console.log('getEWCCurves:', typeof learning.getEWCCurves);
```

Expected output: All should show `function`

## Test 5: Call Planning API

```javascript
await window.electronAPI.planning.startIntake()
  .then(result => console.log('✅ Planning API works!', result))
  .catch(err => console.error('❌ Planning API error:', err));
```

Expected output: Should return a result object with `sessionId`

## Test 6: Call VAC API

```javascript
await window.electronAPI.vac.getAllContracts()
  .then(result => console.log('✅ VAC API works!', result))
  .catch(err => console.error('❌ VAC API error:', err));
```

Expected output: Should return a result object with contracts array

## Test 7: Call Learning API

```javascript
await window.electronAPI.learning.getDecisionHistory()
  .then(result => console.log('✅ Learning API works!', result))
  .catch(err => console.error('❌ Learning API error:', err));
```

Expected output: Should return a result object with decision history

## Test 8: Comprehensive API Check

```javascript
(async () => {
  const tests = [
    { name: 'Planning startIntake', fn: () => window.electronAPI.planning.startIntake() },
    { name: 'VAC getAllContracts', fn: () => window.electronAPI.vac.getAllContracts() },
    { name: 'Learning getDecisionHistory', fn: () => window.electronAPI.learning.getDecisionHistory() },
    { name: 'Planning getQuestions', fn: () => window.electronAPI.planning.getQuestions('test-session') },
    { name: 'VAC getContract', fn: () => window.electronAPI.vac.getContract('test-id') },
    { name: 'Learning getPatterns', fn: () => window.electronAPI.learning.getPatterns() }
  ];

  const results = [];
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ test: test.name, status: '✅ PASS', hasData: !!result });
    } catch (error) {
      results.push({ test: test.name, status: '❌ FAIL', error: error.message });
    }
  }

  console.table(results);
  const passed = results.filter(r => r.status === '✅ PASS').length;
  const total = results.length;
  console.log(`\n🎯 Results: ${passed}/${total} tests passed (${(passed/total*100).toFixed(1)}%)`);
})();
```

Expected output: Should show a table with test results, ideally 100% passing
