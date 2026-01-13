// Comprehensive API Verification Script
// Tests all rad-engineer APIs (Planning, VAC, Learning) via Chrome DevTools Protocol

const WebSocket = require('ws');

const PAGE_ID = '463EC43F842D7F56CFB2F64341A5AE48';
const ws = new WebSocket(`ws://localhost:9222/devtools/page/${PAGE_ID}`);

let msgId = 1;
const results = {
  planning: [],
  vac: [],
  learning: []
};

ws.on('open', async () => {
  console.log('🔌 Connected to rad-engineer Electron app\n');

  // Enable Runtime
  ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));

  setTimeout(() => runTests(), 1000);
});

function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  rad-engineer API Verification Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: Check API namespaces exist
  console.log('📋 Test 1: Checking API namespaces...');
  ws.send(JSON.stringify({
    id: msgId++,
    method: 'Runtime.evaluate',
    params: {
      expression: `JSON.stringify({
        planning: typeof window.electronAPI?.planning,
        vac: typeof window.electronAPI?.vac,
        learning: typeof window.electronAPI?.learning
      })`,
      returnByValue: true
    }
  }));

  // Test 2: Check planning methods
  setTimeout(() => {
    console.log('\n📋 Test 2: Checking planning methods...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `JSON.stringify({
          startIntake: typeof window.electronAPI?.planning?.startIntake,
          submitAnswers: typeof window.electronAPI?.planning?.submitAnswers,
          generatePlan: typeof window.electronAPI?.planning?.generatePlan,
          validatePlan: typeof window.electronAPI?.planning?.validatePlan
        })`,
        returnByValue: true
      }
    }));
  }, 1500);

  // Test 3: Check VAC methods
  setTimeout(() => {
    console.log('\n📋 Test 3: Checking VAC methods...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `JSON.stringify({
          getAllContracts: typeof window.electronAPI?.vac?.getAllContracts,
          getContract: typeof window.electronAPI?.vac?.getContract,
          runVerification: typeof window.electronAPI?.vac?.runVerification,
          checkDrift: typeof window.electronAPI?.vac?.checkDrift
        })`,
        returnByValue: true
      }
    }));
  }, 3000);

  // Test 4: Check Learning methods
  setTimeout(() => {
    console.log('\n📋 Test 4: Checking Learning methods...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `JSON.stringify({
          getDecisionHistory: typeof window.electronAPI?.learning?.getDecisionHistory,
          getPatterns: typeof window.electronAPI?.learning?.getPatterns,
          getLearningAnalytics: typeof window.electronAPI?.learning?.getLearningAnalytics,
          getMethodEffectiveness: typeof window.electronAPI?.learning?.getMethodEffectiveness
        })`,
        returnByValue: true
      }
    }));
  }, 4500);

  // Test 5: Call planning.startIntake()
  setTimeout(() => {
    console.log('\n📋 Test 5: Calling planning.startIntake()...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `(async () => {
          try {
            const result = await window.electronAPI.planning.startIntake();
            return JSON.stringify({
              success: true,
              hasSessionId: !!result.sessionId,
              sessionId: result.sessionId,
              data: result
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error.message
            });
          }
        })()`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  }, 6000);

  // Test 6: Call vac.getAllContracts()
  setTimeout(() => {
    console.log('\n📋 Test 6: Calling vac.getAllContracts()...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `(async () => {
          try {
            const result = await window.electronAPI.vac.getAllContracts();
            return JSON.stringify({
              success: true,
              hasContracts: Array.isArray(result.contracts),
              count: result.contracts?.length,
              contracts: result.contracts
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error.message
            });
          }
        })()`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  }, 7500);

  // Test 7: Call learning.getDecisionHistory()
  setTimeout(() => {
    console.log('\n📋 Test 7: Calling learning.getDecisionHistory()...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `(async () => {
          try {
            const result = await window.electronAPI.learning.getDecisionHistory();
            return JSON.stringify({
              success: true,
              hasDecisions: Array.isArray(result.decisions),
              count: result.decisions?.length,
              decisions: result.decisions?.slice(0, 3)
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error.message
            });
          }
        })()`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  }, 9000);

  // Test 8: Call learning.getPatterns()
  setTimeout(() => {
    console.log('\n📋 Test 8: Calling learning.getPatterns()...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `(async () => {
          try {
            const result = await window.electronAPI.learning.getPatterns();
            return JSON.stringify({
              success: true,
              hasPatterns: Array.isArray(result.patterns),
              count: result.patterns?.length,
              patterns: result.patterns?.slice(0, 2)
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error.message
            });
          }
        })()`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  }, 10500);

  // Generate final report
  setTimeout(() => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  📊 VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const totalTests = msgId - 2; // Subtract Runtime.enable call
    console.log(`Total Tests: ${totalTests}`);
    console.log('\nAll results logged above. Check for:');
    console.log('  ✅ API namespaces are "object"');
    console.log('  ✅ API methods are "function"');
    console.log('  ✅ API calls return success: true');
    console.log('  ✅ Data structures match expected format\n');

    setTimeout(() => process.exit(0), 2000);
  }, 12000);
}

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.id && msg.id > 1 && msg.result?.result?.value) {
    const value = msg.result.result.value;
    try {
      const parsed = JSON.parse(value);
      console.log('  ✅ Result:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('  ✅ Result:', value);
    }
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n🔌 Disconnected');
});
