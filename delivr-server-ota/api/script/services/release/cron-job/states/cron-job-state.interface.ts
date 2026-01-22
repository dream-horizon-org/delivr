/**
 * Cron Job State Interface
 * 
 * Defines the contract that all state classes (Kickoff, Regression, PreRelease) must implement.
 * 
 * This is the core of State Pattern:
 * - Each state implements these 4 methods
 * - State Machine (context) calls these methods
 * - States are self-contained and independent
 */

import { TaskStage } from '~models/release/release.interface';

export interface ICronJobState {
  /**
   * Execute the state's logic
   * 
   * For Stage 1 (Kickoff):
   * - Execute pending tasks in order
   * - Respect time constraints (kickoff reminder, branch fork)
   * - Handle task execution errors
   * 
   * For Stage 2 (Regression):
   * - Create cycles when slot time arrives
   * - Execute cycle tasks
   * - Mark cycles as DONE
   * 
   * For Stage 3 (Pre-Release):
   * - Create Stage 3 tasks if needed
   * - Execute tasks
   */
  execute(): Promise<void>;

  /**
   * Check if the state is complete
   * 
   * Returns true when:
   * - Stage 1: All required tasks are COMPLETED
   * - Stage 2: All cycles DONE + no upcoming slots
   * - Stage 3: All required tasks are COMPLETED
   * 
   * Note: Complete doesn't mean transition!
   * A stage can be complete but stay in same state (manual mode)
   */
  isComplete(): Promise<boolean>;

  /**
   * Transition to the next state
   * 
   * This is where conditional logic lives:
   * - Check autoTransition flag
   * - If YES: Change to next state
   * - If NO: Stay in current state (manual mode)
   * 
   * Stage 1 → Stage 2 (if autoTransitionToStage2)
   * Stage 2 → Stage 3 (if autoTransitionToStage3)
   * Stage 3 → END (no next state)
   */
  transitionToNext(): Promise<void>;

  /**
   * Get the stage this state represents
   * 
   * Used for:
   * - Debugging (know which state we're in)
   * - Logging (show current stage)
   * - State machine initialization (determine starting state)
   */
  getStage(): TaskStage;
}


