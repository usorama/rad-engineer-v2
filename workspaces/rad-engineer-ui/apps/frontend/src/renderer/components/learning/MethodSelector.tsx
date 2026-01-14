/**
 * MethodSelector - Container for BMAD method selection wizard
 *
 * Provides search, filtering, and method selection flow:
 * Browse → Select → Confirm
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { MethodCatalog } from './MethodCatalog';
import { type BMADMethod } from './MethodCard';
import { CheckCircle2, XCircle } from 'lucide-react';

// 50 BMAD methods from research
const BMAD_METHODS: BMADMethod[] = [
  {
    id: 'chunking',
    name: 'Chunking',
    domain: 'Memory',
    effectiveness: 0.85,
    description: 'Breaking information into manageable chunks for better retention',
    research: 'Miller (1956) - cognitive load theory',
    whenToUse: 'When dealing with large amounts of information'
  },
  {
    id: 'spaced-repetition',
    name: 'Spaced Repetition',
    domain: 'Memory',
    effectiveness: 0.92,
    description: 'Reviewing material at increasing intervals to improve long-term retention',
    research: 'Ebbinghaus forgetting curve research',
    whenToUse: 'For memorizing facts, vocabulary, or procedures'
  },
  {
    id: 'interleaving',
    name: 'Interleaving',
    domain: 'Problem Solving',
    effectiveness: 0.78,
    description: 'Mixing different types of problems or subjects during practice',
    research: 'Rohrer & Taylor (2007) - transfer learning',
    whenToUse: 'When learning related but distinct concepts'
  },
  {
    id: 'elaboration',
    name: 'Elaboration',
    domain: 'Understanding',
    effectiveness: 0.81,
    description: 'Explaining and describing ideas with many details',
    research: 'Levels of processing framework',
    whenToUse: 'For deep understanding of complex topics'
  },
  {
    id: 'dual-coding',
    name: 'Dual Coding',
    domain: 'Memory',
    effectiveness: 0.88,
    description: 'Combining visual and verbal information to enhance learning',
    research: 'Paivio (1971) - dual coding theory',
    whenToUse: 'When visual representations are available'
  },
  {
    id: 'retrieval-practice',
    name: 'Retrieval Practice',
    domain: 'Memory',
    effectiveness: 0.91,
    description: 'Actively recalling information from memory without looking at notes',
    research: 'Testing effect research',
    whenToUse: 'After initial learning, before exams'
  },
  {
    id: 'self-explanation',
    name: 'Self-Explanation',
    domain: 'Understanding',
    effectiveness: 0.79,
    description: 'Explaining concepts to yourself in your own words',
    research: 'Chi et al. (1989) - self-explanation effect',
    whenToUse: 'While reading or learning new material'
  },
  {
    id: 'concrete-examples',
    name: 'Concrete Examples',
    domain: 'Understanding',
    effectiveness: 0.76,
    description: 'Using specific, real-world examples to illustrate abstract concepts',
    research: 'Concreteness fading research',
    whenToUse: 'When learning abstract or theoretical content'
  },
  {
    id: 'analogical-reasoning',
    name: 'Analogical Reasoning',
    domain: 'Transfer',
    effectiveness: 0.74,
    description: 'Drawing comparisons between new and familiar concepts',
    research: 'Gentner et al. (2003) - structure mapping',
    whenToUse: 'For unfamiliar or complex domains'
  },
  {
    id: 'metacognitive-monitoring',
    name: 'Metacognitive Monitoring',
    domain: 'Self-Regulation',
    effectiveness: 0.83,
    description: 'Actively monitoring your understanding and learning progress',
    research: 'Flavell (1979) - metacognition theory',
    whenToUse: 'Throughout the learning process'
  },
  {
    id: 'worked-examples',
    name: 'Worked Examples',
    domain: 'Problem Solving',
    effectiveness: 0.80,
    description: 'Studying step-by-step solutions before attempting problems',
    research: 'Cognitive load theory - Sweller (1988)',
    whenToUse: 'When learning new problem-solving procedures'
  },
  {
    id: 'generation',
    name: 'Generation',
    domain: 'Memory',
    effectiveness: 0.77,
    description: 'Attempting to produce information before it is presented',
    research: 'Generation effect research',
    whenToUse: 'Before reading or learning new material'
  },
  {
    id: 'knowledge-organization',
    name: 'Knowledge Organization',
    domain: 'Understanding',
    effectiveness: 0.82,
    description: 'Creating structured frameworks like concept maps or outlines',
    research: 'Schema theory research',
    whenToUse: 'When integrating multiple pieces of information'
  },
  {
    id: 'distributed-practice',
    name: 'Distributed Practice',
    domain: 'Memory',
    effectiveness: 0.87,
    description: 'Spreading study sessions over time rather than cramming',
    research: 'Spacing effect - Cepeda et al. (2006)',
    whenToUse: 'For long-term retention goals'
  },
  {
    id: 'desirable-difficulties',
    name: 'Desirable Difficulties',
    domain: 'Transfer',
    effectiveness: 0.75,
    description: 'Introducing challenges that slow learning but improve retention',
    research: 'Bjork (1994) - new theory of disuse',
    whenToUse: 'After basic competence is achieved'
  },
  {
    id: 'peer-teaching',
    name: 'Peer Teaching',
    domain: 'Understanding',
    effectiveness: 0.84,
    description: 'Teaching material to others to deepen your own understanding',
    research: 'Protégé effect research',
    whenToUse: 'After learning new material'
  },
  {
    id: 'contextual-interference',
    name: 'Contextual Interference',
    domain: 'Transfer',
    effectiveness: 0.72,
    description: 'Practicing skills in varied contexts and conditions',
    research: 'Shea & Morgan (1979) - motor learning',
    whenToUse: 'For skill development and transfer'
  },
  {
    id: 'questioning',
    name: 'Elaborative Questioning',
    domain: 'Understanding',
    effectiveness: 0.78,
    description: 'Asking "why" and "how" questions about the material',
    research: 'Question generation research',
    whenToUse: 'While reading or studying'
  },
  {
    id: 'mind-mapping',
    name: 'Mind Mapping',
    domain: 'Memory',
    effectiveness: 0.73,
    description: 'Creating visual diagrams that show relationships between concepts',
    research: 'Buzan (1974) - radiant thinking',
    whenToUse: 'For organizing complex information'
  },
  {
    id: 'summarization',
    name: 'Summarization',
    domain: 'Understanding',
    effectiveness: 0.71,
    description: 'Condensing information into key points in your own words',
    research: 'Dunlosky et al. (2013) - learning strategies',
    whenToUse: 'After reading or lectures'
  },
  {
    id: 'mnemonic-devices',
    name: 'Mnemonic Devices',
    domain: 'Memory',
    effectiveness: 0.69,
    description: 'Using memory aids like acronyms or rhymes',
    research: 'Ancient memory palace techniques',
    whenToUse: 'For memorizing lists or sequences'
  },
  {
    id: 'deliberate-practice',
    name: 'Deliberate Practice',
    domain: 'Skill Development',
    effectiveness: 0.89,
    description: 'Focused practice on specific weaknesses with immediate feedback',
    research: 'Ericsson et al. (1993) - expertise development',
    whenToUse: 'For developing expertise in a domain'
  },
  {
    id: 'feedback-loops',
    name: 'Feedback Loops',
    domain: 'Self-Regulation',
    effectiveness: 0.86,
    description: 'Seeking and incorporating feedback to improve performance',
    research: 'Feedback intervention theory',
    whenToUse: 'Throughout skill development'
  },
  {
    id: 'pre-testing',
    name: 'Pre-Testing',
    domain: 'Memory',
    effectiveness: 0.74,
    description: 'Testing yourself before learning to prime memory',
    research: 'Kornell et al. (2009) - unsuccessful retrieval',
    whenToUse: 'Before studying new material'
  },
  {
    id: 'error-analysis',
    name: 'Error Analysis',
    domain: 'Problem Solving',
    effectiveness: 0.81,
    description: 'Systematically analyzing mistakes to understand gaps',
    research: 'Error detection and correction research',
    whenToUse: 'After practice or assessments'
  },
  {
    id: 'goal-setting',
    name: 'Goal Setting',
    domain: 'Self-Regulation',
    effectiveness: 0.77,
    description: 'Setting specific, measurable learning objectives',
    research: 'Locke & Latham (1990) - goal-setting theory',
    whenToUse: 'At the beginning of learning sessions'
  },
  {
    id: 'case-based-learning',
    name: 'Case-Based Learning',
    domain: 'Transfer',
    effectiveness: 0.80,
    description: 'Learning through analysis of real-world scenarios',
    research: 'Problem-based learning research',
    whenToUse: 'For applied knowledge domains'
  },
  {
    id: 'variability-practice',
    name: 'Variability Practice',
    domain: 'Transfer',
    effectiveness: 0.76,
    description: 'Practicing skills under varying conditions',
    research: 'Schmidt (1975) - schema theory of motor learning',
    whenToUse: 'For skills that need to transfer'
  },
  {
    id: 'attention-management',
    name: 'Attention Management',
    domain: 'Self-Regulation',
    effectiveness: 0.82,
    description: 'Deliberately controlling focus and minimizing distractions',
    research: 'Attention theory - Posner (1980)',
    whenToUse: 'During all learning activities'
  },
  {
    id: 'progressive-alignment',
    name: 'Progressive Alignment',
    domain: 'Understanding',
    effectiveness: 0.79,
    description: 'Gradually increasing the complexity of material',
    research: 'Scaffolding theory - Vygotsky (1978)',
    whenToUse: 'When learning hierarchical knowledge'
  },
  {
    id: 'contrast-cases',
    name: 'Contrast Cases',
    domain: 'Understanding',
    effectiveness: 0.75,
    description: 'Comparing similar cases to highlight key differences',
    research: 'Schwartz & Bransford (1998) - differentiation',
    whenToUse: 'For distinguishing similar concepts'
  },
  {
    id: 'productive-failure',
    name: 'Productive Failure',
    domain: 'Problem Solving',
    effectiveness: 0.73,
    description: 'Attempting problems before instruction to activate prior knowledge',
    research: 'Kapur (2008) - invention activities',
    whenToUse: 'Before formal instruction'
  },
  {
    id: 'reflection',
    name: 'Reflection',
    domain: 'Self-Regulation',
    effectiveness: 0.80,
    description: 'Thinking about what you learned and how you learned it',
    research: 'Schön (1983) - reflective practice',
    whenToUse: 'After learning sessions or projects'
  },
  {
    id: 'sleep-consolidation',
    name: 'Sleep Consolidation',
    domain: 'Memory',
    effectiveness: 0.88,
    description: 'Leveraging sleep to strengthen memory formation',
    research: 'Walker & Stickgold (2006) - memory consolidation',
    whenToUse: 'Planning learning schedules'
  },
  {
    id: 'multimodal-learning',
    name: 'Multimodal Learning',
    domain: 'Memory',
    effectiveness: 0.81,
    description: 'Engaging multiple senses (visual, auditory, kinesthetic)',
    research: 'VARK learning styles research',
    whenToUse: 'When multiple modalities are available'
  },
  {
    id: 'anchoring',
    name: 'Anchoring',
    domain: 'Transfer',
    effectiveness: 0.77,
    description: 'Connecting new information to strong existing knowledge',
    research: 'Ausubel (1968) - meaningful learning',
    whenToUse: 'When introducing new topics'
  },
  {
    id: 'predict-observe-explain',
    name: 'Predict-Observe-Explain',
    domain: 'Understanding',
    effectiveness: 0.78,
    description: 'Making predictions before observing outcomes',
    research: 'Inquiry-based learning research',
    whenToUse: 'In science and experiential learning'
  },
  {
    id: 'backward-chaining',
    name: 'Backward Chaining',
    domain: 'Skill Development',
    effectiveness: 0.74,
    description: 'Learning complex procedures by starting from the end',
    research: 'Task analysis and instruction',
    whenToUse: 'For procedural learning'
  },
  {
    id: 'criterion-learning',
    name: 'Criterion Learning',
    domain: 'Self-Regulation',
    effectiveness: 0.76,
    description: 'Practicing until reaching a set performance standard',
    research: 'Mastery learning - Bloom (1968)',
    whenToUse: 'For essential foundational skills'
  },
  {
    id: 'cognitive-offloading',
    name: 'Cognitive Offloading',
    domain: 'Problem Solving',
    effectiveness: 0.70,
    description: 'Using external tools to reduce cognitive load',
    research: 'Extended cognition theory',
    whenToUse: 'During complex problem-solving'
  },
  {
    id: 'story-method',
    name: 'Story Method',
    domain: 'Memory',
    effectiveness: 0.79,
    description: 'Embedding information within a narrative structure',
    research: 'Narrative encoding research',
    whenToUse: 'For sequential information'
  },
  {
    id: 'peer-assessment',
    name: 'Peer Assessment',
    domain: 'Self-Regulation',
    effectiveness: 0.75,
    description: 'Evaluating others work to develop judgment skills',
    research: 'Assessment for learning research',
    whenToUse: 'In collaborative learning contexts'
  },
  {
    id: 'learning-journals',
    name: 'Learning Journals',
    domain: 'Self-Regulation',
    effectiveness: 0.72,
    description: 'Recording learning experiences and insights',
    research: 'Reflective practice research',
    whenToUse: 'Throughout extended learning periods'
  },
  {
    id: 'errorless-learning',
    name: 'Errorless Learning',
    domain: 'Skill Development',
    effectiveness: 0.68,
    description: 'Preventing errors during initial learning',
    research: 'Terrace (1963) - discrimination learning',
    whenToUse: 'For rehabilitation or high-stakes learning'
  },
  {
    id: 'cognitive-apprenticeship',
    name: 'Cognitive Apprenticeship',
    domain: 'Skill Development',
    effectiveness: 0.83,
    description: 'Learning through modeling, coaching, and scaffolding',
    research: 'Collins et al. (1989) - situated learning',
    whenToUse: 'For complex skill development'
  },
  {
    id: 'transfer-appropriate',
    name: 'Transfer-Appropriate Processing',
    domain: 'Transfer',
    effectiveness: 0.81,
    description: 'Practicing in conditions similar to performance context',
    research: 'Morris et al. (1977) - encoding specificity',
    whenToUse: 'When preparing for specific applications'
  },
  {
    id: 'knowledge-surveys',
    name: 'Knowledge Surveys',
    domain: 'Self-Regulation',
    effectiveness: 0.73,
    description: 'Assessing confidence in knowledge before learning',
    research: 'Self-assessment accuracy research',
    whenToUse: 'At course or unit beginning'
  },
  {
    id: 'concept-invention',
    name: 'Concept Invention',
    domain: 'Understanding',
    effectiveness: 0.76,
    description: 'Creating your own frameworks before formal instruction',
    research: 'Schwartz & Martin (2004) - preparation for learning',
    whenToUse: 'Before introducing formal concepts'
  },
  {
    id: 'analogical-encoding',
    name: 'Analogical Encoding',
    domain: 'Transfer',
    effectiveness: 0.78,
    description: 'Comparing multiple examples to extract principles',
    research: 'Gick & Holyoak (1983) - schema induction',
    whenToUse: 'When learning generalizable principles'
  },
  {
    id: 'testing-effect',
    name: 'Testing Effect',
    domain: 'Memory',
    effectiveness: 0.90,
    description: 'Taking practice tests to strengthen memory retrieval',
    research: 'Roediger & Butler (2011) - retrieval benefits',
    whenToUse: 'Throughout learning and before exams'
  }
];

interface SelectMethodResponse {
  success: boolean;
  data?: { methodId: string; appliedAt: number };
  error?: string;
}

interface MethodEffectivenessResponse {
  success: boolean;
  data?: { methodId: string; effectiveness: number };
  error?: string;
}

export function MethodSelector() {
  const { t } = useTranslation(['learning', 'common']);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState<BMADMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract unique domains from methods
  const domains = Array.from(new Set(BMAD_METHODS.map((m) => m.domain))).sort();

  // Load effectiveness data when method is selected
  useEffect(() => {
    if (!selectedMethod) return;

    const loadEffectiveness = async () => {
      try {
        const result: MethodEffectivenessResponse =
          await window.api.learning.getMethodEffectiveness(selectedMethod.id);

        if (result.success && result.data) {
          // Update effectiveness if different from default
          setSelectedMethod((prev) =>
            prev
              ? {
                  ...prev,
                  effectiveness: result.data?.effectiveness ?? prev.effectiveness
                }
              : null
          );
        }
      } catch (_err) {
        // Silently fail - use default effectiveness
      }
    };

    loadEffectiveness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod?.id]);

  const handleSelectMethod = (method: BMADMethod) => {
    // Toggle selection
    if (selectedMethod?.id === method.id) {
      setSelectedMethod(null);
    } else {
      setSelectedMethod(method);
      setSuccess(false);
      setError(null);
    }
  };

  const handleConfirm = async () => {
    if (!selectedMethod) return;

    try {
      setSubmitting(true);
      setError(null);

      const result: SelectMethodResponse = await window.api.learning.selectMethod(
        selectedMethod.id
      );

      if (result.success) {
        setSuccess(true);
        // Clear selection after 2 seconds
        setTimeout(() => {
          setSelectedMethod(null);
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || t('learning:methodSelector.errors.selectFailed'));
      }
    } catch (_err) {
      setError(t('learning:methodSelector.errors.selectFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedMethod(null);
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('learning:methodSelector.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('learning:methodSelector.subtitle')}</p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <Input
          type="search"
          placeholder={t('learning:methodSelector.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-48" aria-label={t('learning:methodSelector.filters.domain')}>
            <SelectValue placeholder={t('learning:methodSelector.filters.domain')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('learning:methodSelector.filters.allDomains')}</SelectItem>
            {domains.map((domain) => (
              <SelectItem key={domain} value={domain}>
                {domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-green-50 border border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">{t('learning:methodSelector.success')}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-red-50 border border-red-200">
          <XCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Method Catalog */}
        <div className="flex-1 overflow-y-auto">
          <MethodCatalog
            methods={BMAD_METHODS}
            onSelect={handleSelectMethod}
            searchQuery={searchQuery}
            domainFilter={domainFilter}
            selectedMethodId={selectedMethod?.id}
          />
        </div>

        {/* Method Details Panel */}
        {selectedMethod && (
          <div
            className="w-96 flex-shrink-0 overflow-y-auto"
            role="region"
            aria-label={t('learning:methodSelector.details.title')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('learning:methodSelector.details.title')}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{selectedMethod.domain}</Badge>
                  <span className="text-sm">
                    {t('learning:methodSelector.card.effectiveness')}:{' '}
                    <span className="font-bold">
                      {Math.round(selectedMethod.effectiveness * 100)}%
                    </span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{selectedMethod.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMethod.description}</p>
                </div>

                {selectedMethod.research && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">
                      {t('learning:methodSelector.details.research')}
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedMethod.research}</p>
                  </div>
                )}

                {selectedMethod.whenToUse && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">
                      {t('learning:methodSelector.details.whenToUse')}
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedMethod.whenToUse}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="flex-1"
                    aria-label={t('learning:methodSelector.actions.confirm')}
                  >
                    {submitting
                      ? t('common:labels.loading')
                      : t('learning:methodSelector.actions.confirm')}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={submitting}
                    aria-label={t('learning:methodSelector.actions.cancel')}
                  >
                    {t('learning:methodSelector.actions.cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
