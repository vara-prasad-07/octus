import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Call Gemini LLM to analyze sprint data
 */
export const callGeminiForAnalysis = async (currentTasks, completedTasks) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file');
  }

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  // Prepare the prompt with current and historical data
  const prompt = buildAnalysisPrompt(currentTasks, completedTasks);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    
    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // Parse the JSON response from Gemini
    const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/) || 
                      generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('Gemini response:', generatedText);
      throw new Error('Failed to parse JSON from Gemini response');
    }

    const analysisData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    return analysisData;

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Failed to get AI analysis: ${error.message}`);
  }
};

/**
 * Build the analysis prompt for Gemini
 */
const buildAnalysisPrompt = (currentTasks, completedTasks) => {
  const inProgressTasks = currentTasks.filter(t => t.status !== 'done');
  const doneTasks = currentTasks.filter(t => t.status === 'done');
  const todoTasks = currentTasks.filter(t => t.status === 'todo');
  const totalVelocity = currentTasks.reduce((sum, t) => sum + (parseInt(t.velocity) || 0), 0);
  const completedVelocity = doneTasks.reduce((sum, t) => sum + (parseInt(t.velocity) || 0), 0);
  const totalBugs = currentTasks.reduce((sum, t) => sum + (parseInt(t.bugs) || 0), 0);
  
  // Group by module
  const moduleStats = {};
  currentTasks.forEach(task => {
    const module = task.module || 'Unassigned';
    if (!moduleStats[module]) {
      moduleStats[module] = { velocity: 0, bugs: 0, count: 0 };
    }
    moduleStats[module].velocity += parseInt(task.velocity) || 0;
    moduleStats[module].bugs += parseInt(task.bugs) || 0;
    moduleStats[module].count += 1;
  });

  return `You are an expert AI sprint planning analyst with deep knowledge of software development patterns, velocity estimation, and risk assessment. Your role is to analyze sprint data and provide actionable, data-driven insights.

## CONTEXT & ROLE
You analyze software development sprints to identify risks, predict outcomes, and recommend optimizations. You base predictions on historical patterns, industry standards, and complexity analysis.

## CURRENT SPRINT OVERVIEW
- **Total Features**: ${currentTasks.length}
- **Total Velocity**: ${totalVelocity} points
- **Completed**: ${completedVelocity} points (${totalVelocity > 0 ? Math.round((completedVelocity/totalVelocity)*100) : 0}%)
- **In Progress**: ${inProgressTasks.length} features
- **To Do**: ${todoTasks.length} features
- **Total Bugs**: ${totalBugs} bugs
- **Average Bugs per Feature**: ${currentTasks.length > 0 ? (totalBugs / currentTasks.length).toFixed(1) : 0}

## MODULE BREAKDOWN
${Object.entries(moduleStats).map(([module, stats]) => 
  `- **${module}**: ${stats.count} features, ${stats.velocity} velocity points, ${stats.bugs} bugs`
).join('\n')}

## CURRENT SPRINT FEATURES (Detailed)
${currentTasks.map((task, i) => 
  `${i+1}. **${task.name}**
   - Module: ${task.module || 'Unassigned'}
   - Velocity: ${task.velocity || 0} points
   - Bugs: ${task.bugs || 0}
   - Status: ${task.status}
   - Due Date: ${task.dueDate || 'Not set'}
   - ID: ${task.id}`
).join('\n\n')}

## HISTORICAL DATA (Completed Tasks)
${completedTasks.length > 0 ? `
Found ${completedTasks.length} completed tasks for pattern analysis:
${completedTasks.map((task, i) => 
  `${i+1}. **${task.name}**
   - Module: ${task.module || 'Unassigned'}
   - Velocity: ${task.velocity || 0} points
   - Bugs: ${task.bugs || 0}
   - Completed: ${task.completedDate || task.dueDate || 'Unknown date'}
   - Status: ${task.status}`
).join('\n\n')}

**Historical Patterns to Analyze:**
- Calculate average velocity per module
- Identify bug patterns by module
- Determine velocity accuracy (if historical planned vs actual data exists)
- Find correlation between velocity and bugs
` : `
**No historical data available.** Use industry standards:
- Average velocity accuracy: 85%
- High complexity tasks (13+ velocity): typically take 25-30% longer
- Backend/API modules: typically 2x more bugs than UI modules
- Tasks with 3+ bugs: high risk, may delay by 2-3 days
`}

## ANALYSIS INSTRUCTIONS

### 1. COMPLETED TASKS ANALYSIS
- Analyze the ${completedTasks.length} completed tasks
- Calculate actual performance metrics
- Identify patterns (velocity accuracy, bug density, module performance)
- Generate 3-4 specific insights based on real data

### 2. NEW TASKS PREDICTIONS
For each incomplete task (status: 'in-progress' or 'todo'):
- **Risk Assessment**: Calculate risk score (0-100) based on:
  * Velocity complexity (13+ = high risk)
  * Current bug count (3+ = critical)
  * Module historical performance
  * Dependencies and blockers
- **Velocity Prediction**: Adjust planned velocity based on patterns
- **Time Prediction**: Estimate realistic days needed
- **Bug Prediction**: Forecast additional bugs based on complexity
- **Reasoning**: Provide specific, data-driven explanation
- **Recommendations**: Give 2-4 actionable steps

### 3. RISK LEVELS
- **Low Risk (0-40)**: On track, minimal adjustments needed
- **High Risk (41-75)**: Significant concerns, needs attention
- **Critical Risk (76-100)**: Urgent action required, likely to delay

### 4. SUGGESTIONS
Provide 3-5 strategic suggestions covering:
- Velocity/scope adjustments
- Timeline risks and buffers
- Bug management priorities
- Module-specific concerns
- Resource allocation

### 5. EXECUTIVE SUMMARY
Write a 2-3 sentence summary highlighting:
- Overall risk level and confidence
- Most critical issue
- Primary recommended action

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no extra text). Use this exact structure:

{
  "summary": {
    "totalTasks": ${currentTasks.length},
    "completedTasks": ${doneTasks.length},
    "newTasks": ${inProgressTasks.length + todoTasks.length},
    "overallRisk": <number 0-100>,
    "predictedDelay": <number of days>,
    "confidence": <number 0-100>
  },
  "completedTasksAnalysis": {
    "title": "Completed Tasks Performance",
    "description": "Analysis of tasks completed in previous sprints to establish baseline",
    "tasks": [
      {
        "name": "<exact task name from completed tasks>",
        "module": "<module name>",
        "completedDate": "<date>",
        "plannedVelocity": <number>,
        "actualVelocity": <number>,
        "plannedDays": <estimated days>,
        "actualDays": <actual days taken>,
        "bugs": <number>,
        "performance": "On Track|Slight Delay|Delayed"
      }
    ],
    "insights": [
      "<specific insight with numbers>",
      "<pattern identified from data>",
      "<actionable observation>"
    ]
  },
  "newTasksPredictions": {
    "title": "New Tasks Risk & Time Prediction",
    "description": "AI predictions for incomplete tasks based on historical patterns",
    "tasks": [
      {
        "id": "<task.id from current tasks>",
        "name": "<exact task.name>",
        "module": "<task.module>",
        "plannedVelocity": <task.velocity>,
        "predictedVelocity": <adjusted velocity>,
        "plannedDays": <estimate based on velocity/2>,
        "predictedDays": <realistic prediction>,
        "riskLevel": "Low|High|Critical",
        "riskScore": <0-100>,
        "bugs": <task.bugs current>,
        "predictedBugs": <forecasted total bugs>,
        "reasoning": "<specific explanation with data references>",
        "recommendations": [
          "<actionable recommendation 1>",
          "<actionable recommendation 2>"
        ]
      }
    ],
    "summary": {
      "totalPlannedVelocity": <sum of planned>,
      "totalPredictedVelocity": <sum of predicted>,
      "velocityGap": <difference>,
      "totalPlannedDays": <sum of planned days>,
      "totalPredictedDays": <sum of predicted days>,
      "timeGap": <difference in days>,
      "highRiskTasks": <count of high+critical risk>,
      "lowRiskTasks": <count of low risk>
    }
  },
  "suggestions": [
    {
      "type": "velocity|timeline|bugs|module",
      "severity": "info|high|critical",
      "title": "<clear, specific title>",
      "description": "<detailed explanation with numbers>",
      "action": "<specific recommended action>"
    }
  ],
  "executiveSummary": "<2-3 sentences: overall risk, critical issue, primary action>"
}

## CRITICAL RULES
1. Use ONLY data from the provided tasks - no fabrication
2. All task IDs, names, modules must match exactly
3. Predictions must be logical (predicted >= planned for high risk)
4. Risk scores must correlate with bugs, velocity, and complexity
5. Insights must reference specific numbers from the data
6. Return ONLY the JSON object, no markdown formatting
7. Ensure all JSON is valid and properly escaped

Generate the analysis now:`;
};

/**
 * Save AI analysis to Firestore
 */
export const saveAIAnalysis = async (projectId, userId, analysisData, tasksAnalyzed) => {
  try {
    const docRef = await addDoc(collection(db, 'aiAnalysis'), {
      projectId,
      userId,
      analysis: analysisData,
      tasksCount: tasksAnalyzed,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving AI analysis:', error);
    throw new Error('Failed to save analysis: ' + error.message);
  }
};

/**
 * Get AI analysis history for a project
 */
export const getAIAnalysisHistory = async (projectId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, 'aiAnalysis'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toDate() || new Date(doc.data().timestamp)
    }));
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    throw new Error('Failed to fetch analysis history: ' + error.message);
  }
};

/**
 * Get completed tasks for historical analysis
 */
export const getCompletedTasks = async (projectId) => {
  try {
    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId),
      where('status', '==', 'done')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching completed tasks:', error);
    return []; // Return empty array if no completed tasks
  }
};
