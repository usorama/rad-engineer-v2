import { KnowledgeBase } from './dist/core/KnowledgeBase.js';

const config = {
  qdrant: {
    url: 'http://127.0.0.1:6333',
    collection: 'claude-code-docs',
    timeout: 90000,
    vectorSize: 768,
  },
  ollama: {
    vps: {
      url: 'http://127.0.0.1:11434',
      embedModel: 'nomic-embed-text',
      summarizeModel: 'llama3.2',
      timeout: 90000,
      maxRetries: 3,
    },
    local: { enabled: false },
  },
  openai: { enabled: false },
  localCache: { enabled: false },
  knowledgeGraph: { enabled: true },
  search: {
    semantic: { enabled: true, weight: 1.0, topK: 5, minScore: 0.7 },
    graph: { enabled: false },
  },
  summarization: { enabled: false },
  mcp: { enabled: false },
  logging: { level: 'error', format: 'json' },
};

const kb = new KnowledgeBase(config);
await kb.initialize();

const docs = [
  {
    title: 'Quickstart Guide',
    url: 'https://docs.claude.com/en/docs/claude-code/quickstart',
    content: 'Claude Code Quickstart\n\nInstall Claude Code: npm install -g @anthropic-ai/claude-code\n\nFirst Steps:\n1. Open terminal\n2. Navigate to project\n3. Run: claude\n4. Claude greets you\n\nClaude Code helps with:\n- Writing and editing code\n- Running tests\n- Debugging\n- Explaining code\n- Refactoring\n\nAuthentication:\n- Browser window opens on first run\n- Log in to Anthropic account\n- Grant permissions\n- Ready to use!'
  },
  {
    title: 'Best Practices',
    url: 'https://docs.claude.com/en/docs/claude-code/best-practices',
    content: 'Claude Code Best Practices\n\nPrinciples:\n1. Be specific in requests\n2. Provide context\n3. Iterate on results\n4. Verify before applying\n\nGood prompts:\n- Add error handling to auth function\n- Refactor payment code for readability\n- Write unit tests for cart component\n\nWorking with large codebases:\n1. Start with high-level questions\n2. Ask about specific modules\n3. Focus on one area at a time\n\nCode review:\n1. Read proposed changes\n2. Understand why they were made\n3. Test before applying\n4. Commit with clear messages'
  },
  {
    title: 'Using Skills',
    url: 'https://docs.claude.com/en/docs/claude-code/using-skills',
    content: 'Using Skills in Claude Code\n\nSkills extend Claude with domain expertise.\n\nSkill locations:\n- Personal: ~/.claude/skills/\n- Project: .claude/skills/\n- Plugin: bundled with plugins\n\nClaude discovers Skills automatically based on:\n- Request context\n- Skill description field\n- Project context\n\nList Skills: Ask "What Skills are available?"\n\nCreate Skills:\n- Personal: mkdir -p ~/.claude/skills/my-skill\n- Project: mkdir -p .claude/skills/my-skill\n- Add SKILL.md with instructions'
  }
];

const documents = docs.map(doc => ({
  source: {
    repo: 'claude/code-docs',
    path: doc.title.toLowerCase().replace(/ /g, '-'),
    language: 'markdown',
  },
  content: doc.content,
  metadata: {
    title: doc.title,
    url: doc.url,
    source: 'docs.claude.com',
    category: 'claude-code',
    createdAt: new Date().toISOString(),
  },
}));

const result = await kb.ingest(documents);
console.log('Ingested', result.documentsProcessed, 'documents');
console.log('Created', result.nodesCreated, 'nodes');

const stats = await kb.getStats();
console.log('Total nodes:', stats.nodes);

await kb.shutdown();
