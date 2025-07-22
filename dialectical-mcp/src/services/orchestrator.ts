import { SessionManager } from '../sessions/manager.js';
import { CritiqueService } from './critique-service.js';
import { ContextualPromptBuilder } from './contextual-prompt-builder.js';
import { StructuredOutputParser } from './structured-output-parser.js';
import { Persona, CritiqueRequest, CritiqueResponse } from '../personas/types.js';
import { ALL_PERSONAS } from '../personas/definitions.js';

export interface DebateWorkflow {
  id: string;
  type: 'sequential' | 'parallel' | 'targeted' | 'audit';
  currentStep: number;
  steps: WorkflowStep[];
  sessionId: string;
  results: Map<string, any>;
}

export interface WorkflowStep {
  personaId: string;
  action: 'critique' | 'rebut' | 'synthesize';
  inputFrom?: string[]; // Previous personas whose output feeds into this step
  outputFormat?: 'text' | 'json' | 'structured';
}

export class Orchestrator {
  private workflows: Map<string, DebateWorkflow> = new Map();
  
  constructor(
    private sessionManager: SessionManager,
    private critiqueService: CritiqueService,
    private contextBuilder: ContextualPromptBuilder,
    private outputParser: StructuredOutputParser
  ) {}

  async runSequentialDebate(
    content: string,
    sessionId: string,
    personaOrder: string[] = ['helios', 'selene', 'prometheus', 'cassandra', 'gaia']
  ): Promise<Map<string, CritiqueResponse>> {
    const workflowId = `workflow-${Date.now()}`;
    const workflow: DebateWorkflow = {
      id: workflowId,
      type: 'sequential',
      currentStep: 0,
      steps: personaOrder.map((personaId, index) => ({
        personaId,
        action: 'critique' as const,
        inputFrom: index > 0 ? personaOrder.slice(0, index) : undefined
      })),
      sessionId,
      results: new Map()
    };
    
    this.workflows.set(workflowId, workflow);
    
    // Execute each step sequentially
    for (const step of workflow.steps) {
      const previousCritiques = this.getPreviousCritiques(workflow, step);
      const context = await this.contextBuilder.buildSequentialContext(
        step.personaId,
        content,
        previousCritiques,
        step.inputFrom
      );
      
      const critique = await this.critiqueService.getCritique(
        step.personaId,
        { content, previousCritiques: Object.fromEntries(previousCritiques) },
        context
      );
      
      workflow.results.set(step.personaId, critique);
      this.sessionManager.addCritique(sessionId, step.personaId, critique.critique);
      workflow.currentStep++;
    }
    
    return workflow.results;
  }

  async runTargetedRebuttal(
    content: string,
    sessionId: string,
    sourcePersona: string,
    targetPersona: string
  ): Promise<CritiqueResponse> {
    // Get the original critique from the source persona
    const session = this.sessionManager.getSession(sessionId);
    const originalCritique = session?.critiques.get(sourcePersona);
    
    if (!originalCritique) {
      // First get the source critique
      const sourceCritique = await this.critiqueService.getCritique(
        sourcePersona,
        { content },
        ''
      );
      this.sessionManager.addCritique(sessionId, sourcePersona, sourceCritique.critique);
      
      // Then get targeted rebuttal
      const context = await this.contextBuilder.buildRebuttalContext(
        targetPersona,
        sourcePersona,
        content,
        sourceCritique.critique
      );
      
      const rebuttal = await this.critiqueService.getCritique(
        targetPersona,
        { 
          content,
          previousCritiques: { [sourcePersona]: sourceCritique.critique }
        },
        context
      );
      
      return rebuttal;
    }
    
    // Build rebuttal context using existing critique
    const context = await this.contextBuilder.buildRebuttalContext(
      targetPersona,
      sourcePersona,
      content,
      originalCritique
    );
    
    return await this.critiqueService.getCritique(
      targetPersona,
      { 
        content,
        previousCritiques: { [sourcePersona]: originalCritique }
      },
      context
    );
  }

  async runAuditWorkflow(
    content: string,
    sessionId: string,
    auditType: 'security' | 'architecture' | 'ux' = 'security'
  ): Promise<any> {
    const personaMap = {
      security: 'cassandra',
      architecture: 'selene',
      ux: 'gaia'
    };
    
    const personaId = personaMap[auditType];
    const persona = ALL_PERSONAS[personaId];
    
    // Use structured output for audits
    if (persona.structuredOutputSchema) {
      const critique = await this.critiqueService.getCritique(
        personaId,
        { content, outputFormat: 'structured' },
        `Perform a detailed ${auditType} audit. Return results in the specified JSON format.`
      );
      
      // Parse and validate the structured output
      const parsed = await this.outputParser.parse(
        critique.critique,
        persona.structuredOutputSchema
      );
      
      this.sessionManager.addCritique(sessionId, personaId, JSON.stringify(parsed, null, 2));
      
      return {
        auditType,
        persona: personaId,
        results: parsed,
        summary: this.generateAuditSummary(parsed, auditType)
      };
    }
    
    // Fallback to regular critique
    const critique = await this.critiqueService.getCritique(
      personaId,
      { content },
      `Perform a detailed ${auditType} audit.`
    );
    
    return {
      auditType,
      persona: personaId,
      results: critique.critique
    };
  }

  private getPreviousCritiques(
    workflow: DebateWorkflow,
    step: WorkflowStep
  ): Map<string, string> {
    const critiques = new Map<string, string>();
    
    if (step.inputFrom) {
      for (const personaId of step.inputFrom) {
        const result = workflow.results.get(personaId);
        if (result) {
          critiques.set(personaId, result.critique);
        }
      }
    }
    
    return critiques;
  }

  private generateAuditSummary(results: any, auditType: string): string {
    if (auditType === 'security' && results.vulnerabilities) {
      const critical = results.vulnerabilities.filter((v: any) => v.severity === 'Critical').length;
      const high = results.vulnerabilities.filter((v: any) => v.severity === 'High').length;
      const total = results.vulnerabilities.length;
      
      return `Found ${total} vulnerabilities: ${critical} Critical, ${high} High. Immediate action required for critical issues.`;
    }
    
    return 'Audit completed. See detailed results above.';
  }

  getWorkflowStatus(workflowId: string): DebateWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  cleanupOldWorkflows(maxAge: number = 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, workflow] of this.workflows) {
      const workflowAge = now - parseInt(workflow.id.split('-')[1]);
      if (workflowAge > maxAge) {
        this.workflows.delete(id);
      }
    }
  }
}