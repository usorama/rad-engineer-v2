/**
 * Test script for rad-engineer IPC handlers
 *
 * Run this in the Auto-Claude renderer console (DevTools) to test the IPC handlers
 */

async function testRadEngineerIPC() {
  console.log('=== Testing rad-engineer IPC handlers ===\n');

  // Test 1: Get all tasks
  console.log('1. Testing rad-engineer:get-all-tasks...');
  try {
    const result = await window.electron.ipcRenderer.invoke('rad-engineer:get-all-tasks');
    console.log('✓ Get all tasks result:', result);
    if (result.success && Array.isArray(result.data)) {
      console.log(`  Found ${result.data.length} tasks`);
      result.data.forEach(task => {
        console.log(`  - ${task.id}: ${task.title} (${task.status})`);
      });
    }
  } catch (error) {
    console.error('✗ Get all tasks failed:', error);
  }

  // Test 2: Create a task
  console.log('\n2. Testing rad-engineer:create-task...');
  try {
    const taskSpec = {
      title: 'Test Task from IPC',
      description: 'This is a test task created via IPC handlers',
      priority: 3,
      tags: ['test', 'ipc']
    };
    const result = await window.electron.ipcRenderer.invoke('rad-engineer:create-task', taskSpec);
    console.log('✓ Create task result:', result);

    if (result.success && result.data) {
      console.log(`  Created task: ${result.data.id}`);

      // Test 3: Get the created task
      console.log('\n3. Testing rad-engineer:get-task...');
      const getResult = await window.electron.ipcRenderer.invoke('rad-engineer:get-task', result.data.id);
      console.log('✓ Get task result:', getResult);

      // Test 4: Start the task
      console.log('\n4. Testing rad-engineer:start-task...');

      // Listen for progress events
      let progressCount = 0;
      const progressHandler = (event) => {
        progressCount++;
        console.log(`  Progress event ${progressCount}:`, event);
      };
      window.electron.ipcRenderer.on('rad-engineer:task-progress', progressHandler);

      const startResult = await window.electron.ipcRenderer.invoke('rad-engineer:start-task', result.data.id);
      console.log('✓ Start task result:', startResult);

      // Wait a bit for progress events
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Cleanup listener
      window.electron.ipcRenderer.removeListener('rad-engineer:task-progress', progressHandler);
      console.log(`  Received ${progressCount} progress events`);
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
  }

  console.log('\n=== Test complete ===');
}

// Run the test
testRadEngineerIPC();
