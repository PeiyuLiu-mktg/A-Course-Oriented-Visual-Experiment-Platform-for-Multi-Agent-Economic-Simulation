export type PolicyId =
  | "free_market"
  | "ai_economist"
  | "progressive"
  | "equality_first"
  | "productivity_first"
  | "rl_planner";

export type CorePolicyId = Exclude<PolicyId, "rl_planner">;
export type ObjectiveId = "balance" | "equality" | "productivity";
export type AgentRole = "gatherer" | "builder" | "trader" | "forester";
export type ActionType = "harvest" | "mine" | "plant" | "build" | "trade" | "move" | "rest";
export type ResourceKind = "tree" | "stone";

export type Policy = {
  id: PolicyId;
  name: string;
  summary: string;
  taxRate: number;
  redistribution: number;
  laborCost: number;
  buildReward: number;
  tradeBonus: number;
  fairnessWeight: number;
  ecologyBoost: number;
};

export type ScenarioConfig = {
  seed: number;
  years: number;
  stepsPerYear: number;
  mapWidth: number;
  mapHeight: number;
  agentCount: number;
  resourceDensity: number;
  objective: ObjectiveId;
  policyId: PolicyId;
  prompt: string;
};

export type CellPoint = {
  x: number;
  y: number;
};

export type AgentState = {
  id: number;
  role: AgentRole;
  x: number;
  y: number;
  wealth: number;
  incomeYear: number;
  taxYear: number;
  wood: number;
  stone: number;
  seeds: number;
  energy: number;
  houses: number;
  plantedTrees: number;
  soldValue: number;
  lastAction: string;
  actionType: ActionType;
  color: string;
  recentPath: CellPoint[];
};

export type ResourceNode = {
  id: number;
  x: number;
  y: number;
  kind: ResourceKind;
  amount: number;
  stage: "sapling" | "mature";
  regrowIn: number;
};

export type HouseNode = {
  id: number;
  x: number;
  y: number;
  ownerId: number;
  yearBuilt: number;
};

export type ActionSummary = Record<ActionType, number>;

export type StepSnapshot = {
  tick: number;
  year: number;
  agents: AgentState[];
  resources: ResourceNode[];
  houses: HouseNode[];
  treasury: number;
  productivity: number;
  equality: number;
  welfare: number;
  avgWealth: number;
  marketHeat: number;
  ecology: number;
  taxSignal: number;
  note: string;
  events: string[];
  actionSummary: ActionSummary;
  activePolicyId: PolicyId;
  activePolicyName: string;
};

export type RLPolicyTrace = {
  year: number;
  state: string;
  policyId: CorePolicyId;
  policyName: string;
  reward: number;
  qValues: number[];
};

export type RLTrainingSummary = {
  algorithm: "Q-learning";
  episodes: number;
  alpha: number;
  gamma: number;
  epsilonStart: number;
  epsilonEnd: number;
  averageReward: number;
  bestReward: number;
  policyTrace: RLPolicyTrace[];
};

export type SimulationRun = {
  config: ScenarioConfig;
  policy: Policy;
  frames: StepSnapshot[];
  highlights: string[];
  finalSummary: string;
  rlTraining: RLTrainingSummary | null;
};

type MacroMetrics = {
  productivity: number;
  equality: number;
  welfare: number;
  avgWealth: number;
  marketHeat: number;
  ecology: number;
  taxSignal: number;
};

type RuntimeState = {
  agents: AgentState[];
  resources: ResourceNode[];
  houses: HouseNode[];
  treasury: number;
  productivityAccumulator: number;
  ecologyScore: number;
  marketHeat: number;
  nextResourceId: number;
  nextHouseId: number;
  random: () => number;
};

type YearSimulationResult = {
  metrics: MacroMetrics;
  leader: AgentState;
};

type QLearningBundle = {
  summary: Omit<RLTrainingSummary, "policyTrace">;
  choosePolicy: (year: number, metrics: MacroMetrics) => RLPolicyTrace;
};

const COLORS = ["#f26d5b", "#f0b454", "#53c7b9", "#6fa8ff", "#ee89d6", "#b3d45c", "#7ce38b", "#ff9e7c"];
const ROLE_LABELS: Record<AgentRole, string> = {
  gatherer: "采集者",
  builder: "建造者",
  trader: "交易者",
  forester: "林业者"
};

const RL_POLICY: Policy = {
  id: "rl_planner",
  name: "Q-learning 规划器",
  summary: "强化学习规划器会按年份观察公平、产出和生态状态，并学习下一年的税收策略。",
  taxRate: 0,
  redistribution: 0,
  laborCost: 0,
  buildReward: 0,
  tradeBonus: 0,
  fairnessWeight: 0,
  ecologyBoost: 0
};

export const POLICIES: Policy[] = [
  {
    id: "free_market",
    name: "自由市场",
    summary: "税负最低，刺激产出，但财富会更快分化。",
    taxRate: 0.05,
    redistribution: 0.08,
    laborCost: 0.82,
    buildReward: 1.38,
    tradeBonus: 1.18,
    fairnessWeight: 0.12,
    ecologyBoost: 0.04
  },
  {
    id: "ai_economist",
    name: "AI Economist",
    summary: "模拟论文中的均衡型政策，在公平、产出和资源恢复之间折中。",
    taxRate: 0.24,
    redistribution: 0.3,
    laborCost: 0.9,
    buildReward: 1.24,
    tradeBonus: 1.1,
    fairnessWeight: 0.38,
    ecologyBoost: 0.11
  },
  {
    id: "progressive",
    name: "累进税制",
    summary: "中等产出，较强再分配，适合作为课堂对照组。",
    taxRate: 0.31,
    redistribution: 0.42,
    laborCost: 0.95,
    buildReward: 1.1,
    tradeBonus: 1,
    fairnessWeight: 0.46,
    ecologyBoost: 0.12
  },
  {
    id: "equality_first",
    name: "公平优先",
    summary: "高再分配、高生态修复，便于观察平均主义下的行为变化。",
    taxRate: 0.4,
    redistribution: 0.56,
    laborCost: 1.02,
    buildReward: 0.98,
    tradeBonus: 0.96,
    fairnessWeight: 0.62,
    ecologyBoost: 0.16
  },
  {
    id: "productivity_first",
    name: "效率优先",
    summary: "鼓励建造与交易，税率低，更容易出现高产出高分化。",
    taxRate: 0.12,
    redistribution: 0.14,
    laborCost: 0.8,
    buildReward: 1.42,
    tradeBonus: 1.26,
    fairnessWeight: 0.18,
    ecologyBoost: 0.05
  },
  RL_POLICY
];

const LEARNABLE_POLICIES = POLICIES.filter((policy) => policy.id !== "rl_planner") as Policy[];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeEquality(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  if (sorted.length === 0 || total <= 0) {
    return 1;
  }

  const weightedSum = sorted.reduce((sum, value, index) => {
    return sum + (2 * (index + 1) - sorted.length - 1) * value;
  }, 0);

  const gini = weightedSum / (sorted.length * total);
  return clamp(1 - gini, 0, 1);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function moveToward(agent: AgentState, target: { x: number; y: number }, width: number, height: number): void {
  if (target.x > agent.x) {
    agent.x += 1;
  } else if (target.x < agent.x) {
    agent.x -= 1;
  } else if (target.y > agent.y) {
    agent.y += 1;
  } else if (target.y < agent.y) {
    agent.y -= 1;
  }

  agent.x = clamp(agent.x, 0, width - 1);
  agent.y = clamp(agent.y, 0, height - 1);
}

function updateRecentPath(agent: AgentState): void {
  const last = agent.recentPath[agent.recentPath.length - 1];
  if (!last || last.x !== agent.x || last.y !== agent.y) {
    agent.recentPath = [...agent.recentPath, { x: agent.x, y: agent.y }].slice(-5);
  }
}

function describeTrend(productivity: number, equality: number, welfare: number, ecology: number): string {
  if (welfare > 0.72 && equality > 0.58 && ecology > 0.52) {
    return "政策进入稳定区，产出、再分配与生态恢复开始相互支撑。";
  }
  if (productivity > 0.75 && equality < 0.45) {
    return "市场活跃度很高，但贫富差距正在被迅速拉大。";
  }
  if (ecology < 0.33) {
    return "树木消耗过快，资源再生正在变成下一阶段的瓶颈。";
  }
  if (equality > 0.7 && productivity < 0.52) {
    return "再分配效果显著，不过部分劳动力激励开始走弱。";
  }
  return "经济体仍在自组织，分工、税负和资源恢复在持续调整。";
}

function getEmptyTile(
  resources: ResourceNode[],
  agents: AgentState[],
  width: number,
  height: number,
  random: () => number
): { x: number; y: number } {
  for (let i = 0; i < 40; i += 1) {
    const candidate = {
      x: Math.floor(random() * width),
      y: Math.floor(random() * height)
    };
    const resource = resources.find((item) => item.x === candidate.x && item.y === candidate.y && item.amount > 0);
    const agent = agents.find((item) => item.x === candidate.x && item.y === candidate.y);
    if (!resource && !agent) {
      return candidate;
    }
  }

  return { x: Math.floor(random() * width), y: Math.floor(random() * height) };
}

function seedActionSummary(): ActionSummary {
  return {
    harvest: 0,
    mine: 0,
    plant: 0,
    build: 0,
    trade: 0,
    move: 0,
    rest: 0
  };
}

function actionVerb(action: ActionType): string {
  return {
    harvest: "砍树",
    mine: "采石",
    plant: "种树",
    build: "建造",
    trade: "交易",
    move: "移动",
    rest: "休整"
  }[action];
}

function getPolicyById(policyId: PolicyId): Policy {
  return POLICIES.find((policy) => policy.id === policyId) ?? RL_POLICY;
}

function createInitialMetrics(runtime: RuntimeState): MacroMetrics {
  const equality = computeEquality(runtime.agents.map((agent) => agent.wealth));
  const avgWealth = average(runtime.agents.map((agent) => agent.wealth));
  const productivity = 0.1;
  const welfare = clamp(productivity * 0.4 + equality * 0.4 + runtime.ecologyScore * 0.2, 0, 1);
  return {
    productivity,
    equality,
    welfare,
    avgWealth,
    marketHeat: runtime.marketHeat,
    ecology: runtime.ecologyScore,
    taxSignal: 0.2
  };
}

function createRuntime(config: ScenarioConfig, seed: number): RuntimeState {
  const random = mulberry32(seed);
  const resources: ResourceNode[] = [];
  const resourceCount = Math.max(18, Math.floor(config.mapWidth * config.mapHeight * config.resourceDensity));

  for (let i = 0; i < resourceCount; i += 1) {
    const isTree = random() > 0.34;
    resources.push({
      id: i,
      x: Math.floor(random() * config.mapWidth),
      y: Math.floor(random() * config.mapHeight),
      kind: isTree ? "tree" : "stone",
      amount: isTree ? 1 : 2 + Math.floor(random() * 4),
      stage: isTree && random() > 0.28 ? "mature" : "sapling",
      regrowIn: isTree ? Math.floor(random() * 3) : 0
    });
  }

  const agents: AgentState[] = Array.from({ length: config.agentCount }, (_, index) => {
    const roles: AgentRole[] = ["gatherer", "builder", "trader", "forester"];
    const x = Math.floor(random() * config.mapWidth);
    const y = Math.floor(random() * config.mapHeight);
    return {
      id: index,
      role: roles[index % roles.length],
      x,
      y,
      wealth: 8 + random() * 4,
      incomeYear: 0,
      taxYear: 0,
      wood: 0,
      stone: 0,
      seeds: 1 + Math.floor(random() * 2),
      energy: 100,
      houses: 0,
      plantedTrees: 0,
      soldValue: 0,
      lastAction: "待机",
      actionType: "rest",
      color: COLORS[index % COLORS.length],
      recentPath: [{ x, y }]
    };
  });

  return {
    agents,
    resources,
    houses: [],
    treasury: 0,
    productivityAccumulator: 0,
    ecologyScore: 0.52,
    marketHeat: 0.46,
    nextResourceId: resourceCount,
    nextHouseId: 0,
    random
  };
}

function encodeState(metrics: MacroMetrics, year: number, objective: ObjectiveId): string {
  const bucket = (value: number) => {
    if (value < 0.34) {
      return "L";
    }
    if (value < 0.67) {
      return "M";
    }
    return "H";
  };

  const phase = year <= 3 ? "early" : year <= 7 ? "mid" : "late";
  return `${objective}|${phase}|E${bucket(metrics.equality)}|P${bucket(metrics.productivity)}|C${bucket(metrics.ecology)}`;
}

function ensureQRow(table: Map<string, number[]>, state: string): number[] {
  if (!table.has(state)) {
    table.set(state, Array.from({ length: LEARNABLE_POLICIES.length }, () => 0));
  }
  return table.get(state)!;
}

function argmax(values: number[]): number {
  let bestIndex = 0;
  let bestValue = values[0] ?? 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > bestValue) {
      bestValue = values[index];
      bestIndex = index;
    }
  }
  return bestIndex;
}

function chooseEpsilonGreedy(qValues: number[], random: () => number, epsilon: number): number {
  if (random() < epsilon) {
    return Math.floor(random() * qValues.length);
  }
  return argmax(qValues);
}

function computeReward(metrics: MacroMetrics, objective: ObjectiveId): number {
  if (objective === "equality") {
    return metrics.equality * 0.55 + metrics.welfare * 0.35 + metrics.ecology * 0.1;
  }
  if (objective === "productivity") {
    return metrics.productivity * 0.5 + metrics.welfare * 0.35 + metrics.marketHeat * 0.15;
  }
  return metrics.welfare * 0.6 + metrics.ecology * 0.15 + metrics.equality * 0.15 + metrics.productivity * 0.1;
}

function simulateYear(
  runtime: RuntimeState,
  config: ScenarioConfig,
  policy: Policy,
  year: number,
  frames: StepSnapshot[] | null
): YearSimulationResult {
  for (let step = 0; step < config.stepsPerYear; step += 1) {
    const market = { x: Math.floor(config.mapWidth / 2), y: Math.floor(config.mapHeight / 2) };
    const events: string[] = [];
    const actionSummary = seedActionSummary();

    for (const node of runtime.resources) {
      if (node.kind === "tree") {
        if (node.stage === "sapling") {
          node.regrowIn = Math.max(node.regrowIn - 1, 0);
          if (node.regrowIn === 0) {
            node.stage = "mature";
            node.amount = 1;
          }
        } else if (node.amount === 0) {
          node.regrowIn = Math.max(node.regrowIn - 1, 0);
          if (node.regrowIn === 0) {
            node.stage = "sapling";
            node.amount = 1;
            node.regrowIn = 3;
          }
        }
      }
    }

    for (const agent of runtime.agents) {
      const matureTree = runtime.resources
        .filter((node) => node.kind === "tree" && node.amount > 0 && node.stage === "mature")
        .sort((a, b) => distance(agent, a) - distance(agent, b))[0];
      const stoneNode = runtime.resources
        .filter((node) => node.kind === "stone" && node.amount > 0)
        .sort((a, b) => distance(agent, a) - distance(agent, b))[0];

      const fairnessPressure = policy.fairnessWeight + (config.objective === "equality" ? 0.1 : 0);
      const productivityBias =
        (config.objective === "productivity" ? 0.12 : 0) + policy.buildReward * 0.05;
      const ecologyBias = policy.ecologyBoost + (config.objective === "equality" ? 0.04 : 0);

      agent.actionType = "rest";
      agent.lastAction = "观察局势";

      const shouldPlant =
        (agent.role === "forester" || (agent.role === "gatherer" && runtime.ecologyScore < 0.46)) &&
        agent.seeds > 0 &&
        runtime.random() > 0.42 - ecologyBias;

      if (
        agent.role === "builder" &&
        agent.wood >= 2 &&
        agent.stone >= 2 &&
        runtime.random() > 0.34 - productivityBias
      ) {
        agent.wood -= 2;
        agent.stone -= 2;
        const reward = 8 * policy.buildReward;
        agent.wealth += reward;
        agent.incomeYear += reward;
        agent.houses += 1;
        if (!runtime.houses.some((house) => house.x === agent.x && house.y === agent.y)) {
          runtime.houses.push({
            id: runtime.nextHouseId,
            x: agent.x,
            y: agent.y,
            ownerId: agent.id,
            yearBuilt: year
          });
          runtime.nextHouseId += 1;
        }
        runtime.productivityAccumulator += reward * 0.08;
        agent.lastAction = "建造房屋";
        agent.actionType = "build";
        actionSummary.build += 1;
        if (events.length < 4) {
          events.push(`A${agent.id + 1} 完成了一处房屋建设。`);
        }
      } else if (
        agent.role === "trader" &&
        (agent.wood + agent.stone >= 2 || runtime.random() > 0.68 - policy.tradeBonus * 0.12)
      ) {
        moveToward(agent, market, config.mapWidth, config.mapHeight);
        if (agent.x === market.x && agent.y === market.y) {
          const sold = agent.wood * 2.3 + agent.stone * 2.6;
          const tradeIncome = sold * policy.tradeBonus;
          agent.wealth += tradeIncome;
          agent.incomeYear += tradeIncome;
          agent.soldValue += tradeIncome;
          runtime.productivityAccumulator += sold * 0.05;
          runtime.marketHeat = clamp(runtime.marketHeat + 0.02, 0, 1);
          agent.wood = 0;
          agent.stone = 0;
          agent.lastAction = "市场交易";
          agent.actionType = "trade";
          actionSummary.trade += 1;
          if (events.length < 4) {
            events.push(`A${agent.id + 1} 在市场完成一笔交易，成交额 ${tradeIncome.toFixed(1)}。`);
          }
        } else {
          agent.lastAction = "前往市场";
          agent.actionType = "move";
          actionSummary.move += 1;
        }
      } else if (shouldPlant) {
        const spot = getEmptyTile(runtime.resources, runtime.agents, config.mapWidth, config.mapHeight, runtime.random);
        moveToward(agent, spot, config.mapWidth, config.mapHeight);
        if (agent.x === spot.x && agent.y === spot.y) {
          runtime.resources.push({
            id: runtime.nextResourceId,
            x: spot.x,
            y: spot.y,
            kind: "tree",
            amount: 1,
            stage: "sapling",
            regrowIn: 3
          });
          runtime.nextResourceId += 1;
          agent.seeds -= 1;
          agent.plantedTrees += 1;
          agent.wealth += 0.8;
          agent.incomeYear += 0.8;
          runtime.ecologyScore = clamp(runtime.ecologyScore + 0.018 + ecologyBias * 0.02, 0, 1);
          agent.lastAction = "种下树苗";
          agent.actionType = "plant";
          actionSummary.plant += 1;
          if (events.length < 4) {
            events.push(`A${agent.id + 1} 正在扩张林地，种下了一棵新树。`);
          }
        } else {
          agent.lastAction = "移动到林地";
          agent.actionType = "move";
          actionSummary.move += 1;
        }
      } else if (matureTree && (agent.role !== "builder" || agent.wood < 2)) {
        moveToward(agent, matureTree, config.mapWidth, config.mapHeight);
        if (agent.x === matureTree.x && agent.y === matureTree.y && matureTree.amount > 0) {
          matureTree.amount = 0;
          matureTree.stage = "sapling";
          matureTree.regrowIn = 4;
          agent.wood += 1;
          agent.seeds += runtime.random() > 0.55 ? 1 : 0;
          agent.wealth += 1.7;
          agent.incomeYear += 1.7;
          runtime.productivityAccumulator += 0.06;
          runtime.ecologyScore = clamp(runtime.ecologyScore - 0.012, 0, 1);
          agent.lastAction = "砍树取木";
          agent.actionType = "harvest";
          actionSummary.harvest += 1;
          if (events.length < 4) {
            events.push(`A${agent.id + 1} 砍下一棵成熟树木，补充了木材库存。`);
          }
        } else {
          agent.lastAction = "前往树林";
          agent.actionType = "move";
          actionSummary.move += 1;
        }
      } else if (stoneNode) {
        moveToward(agent, stoneNode, config.mapWidth, config.mapHeight);
        if (agent.x === stoneNode.x && agent.y === stoneNode.y && stoneNode.amount > 0) {
          stoneNode.amount -= 1;
          agent.stone += 1;
          agent.wealth += 1.9;
          agent.incomeYear += 1.9;
          runtime.productivityAccumulator += 0.05;
          agent.lastAction = "采石";
          agent.actionType = "mine";
          actionSummary.mine += 1;
          if (events.length < 4) {
            events.push(`A${agent.id + 1} 在矿区采到一块石材。`);
          }
        } else {
          agent.lastAction = "前往矿区";
          agent.actionType = "move";
          actionSummary.move += 1;
        }
      } else {
        agent.energy = clamp(agent.energy + 2.2, 30, 100);
        agent.lastAction = "休整";
        agent.actionType = "rest";
        actionSummary.rest += 1;
      }

      const laborDrain =
        policy.laborCost +
        agent.houses * 0.03 -
        fairnessPressure * 0.08 +
        (agent.actionType === "plant" ? -0.08 : 0);
      agent.energy = clamp(agent.energy - laborDrain + 0.6, 30, 100);
      agent.wealth = clamp(agent.wealth - laborDrain * 0.18, 0, 999);
      updateRecentPath(agent);
    }

    const matureTrees = runtime.resources.filter((node) => node.kind === "tree" && node.stage === "mature").length;
    const totalTrees = runtime.resources.filter((node) => node.kind === "tree").length;
    runtime.ecologyScore = clamp(
      runtime.ecologyScore * 0.94 +
        (matureTrees / Math.max(totalTrees, 1)) * 0.05 +
        policy.ecologyBoost * 0.01,
      0,
      1
    );

    const denominator = (year - 1) * config.stepsPerYear + step + 1;
    const productivity = clamp(runtime.productivityAccumulator / (denominator * 3.6), 0, 1);
    const equality = computeEquality(runtime.agents.map((agent) => agent.wealth));
    const welfare = clamp(
      productivity * (0.54 - policy.fairnessWeight * 0.15) +
        equality * (0.3 + policy.fairnessWeight * 0.24) +
        runtime.ecologyScore * 0.18,
      0,
      1
    );
    const avgWealth = average(runtime.agents.map((agent) => agent.wealth));
    const tick = (year - 1) * config.stepsPerYear + step;
    const taxSignal = clamp(policy.taxRate + policy.fairnessWeight * 0.1, 0, 1);

    if (step === Math.floor(config.stepsPerYear / 2)) {
      runtime.marketHeat = clamp(
        runtime.marketHeat + (productivity - equality) * 0.04 + (runtime.ecologyScore - 0.5) * 0.02,
        0,
        1
      );
    }

    if (frames) {
      frames.push({
        tick,
        year,
        agents: runtime.agents.map((agent) => ({
          ...agent,
          recentPath: agent.recentPath.map((point) => ({ ...point }))
        })),
        resources: runtime.resources.map((resource) => ({ ...resource })),
        houses: runtime.houses.map((house) => ({ ...house })),
        treasury: runtime.treasury,
        productivity,
        equality,
        welfare,
        avgWealth,
        marketHeat: runtime.marketHeat,
        ecology: runtime.ecologyScore,
        taxSignal,
        note: describeTrend(productivity, equality, welfare, runtime.ecologyScore),
        events: events.length > 0 ? events : ["这一回合没有剧烈变化，agent 仍在持续分工。"],
        actionSummary,
        activePolicyId: policy.id,
        activePolicyName: policy.name
      });
    }
  }

  const incomes = runtime.agents.map((agent) => agent.incomeYear);
  const meanIncome = average(incomes);
  let redistributed = 0;

  for (const agent of runtime.agents) {
    const extraRate = agent.incomeYear > meanIncome ? 1.12 : 0.88;
    const tax = agent.incomeYear * policy.taxRate * extraRate;
    agent.wealth = clamp(agent.wealth - tax, 0, 999);
    agent.taxYear = tax;
    runtime.treasury += tax;
  }

  redistributed = runtime.treasury * policy.redistribution;
  const dividend = redistributed / runtime.agents.length;
  runtime.treasury -= redistributed;

  const meanWealth = average(runtime.agents.map((item) => item.wealth));
  for (const agent of runtime.agents) {
    const support = dividend * (1 + (agent.wealth < meanWealth ? policy.fairnessWeight : 0));
    agent.wealth += support;
    agent.incomeYear = 0;
    agent.taxYear = 0;
  }

  const finalProductivity = clamp(runtime.productivityAccumulator / (year * config.stepsPerYear * 3.6), 0, 1);
  const finalEquality = computeEquality(runtime.agents.map((agent) => agent.wealth));
  const finalWelfare = clamp(
    finalProductivity * (0.54 - policy.fairnessWeight * 0.15) +
      finalEquality * (0.3 + policy.fairnessWeight * 0.24) +
      runtime.ecologyScore * 0.18,
    0,
    1
  );

  const leader = [...runtime.agents].sort((a, b) => b.wealth - a.wealth)[0];

  return {
    metrics: {
      productivity: finalProductivity,
      equality: finalEquality,
      welfare: finalWelfare,
      avgWealth: average(runtime.agents.map((agent) => agent.wealth)),
      marketHeat: runtime.marketHeat,
      ecology: runtime.ecologyScore,
      taxSignal: clamp(policy.taxRate + policy.fairnessWeight * 0.1, 0, 1)
    },
    leader: { ...leader }
  };
}

function trainQLearningPlanner(config: ScenarioConfig): QLearningBundle {
  const episodes = Math.max(48, Math.min(96, config.years * 8));
  const alpha = 0.18;
  const gamma = 0.92;
  const epsilonStart = 0.32;
  const epsilonEnd = 0.05;
  const qTable = new Map<string, number[]>();
  const rewards: number[] = [];

  for (let episode = 0; episode < episodes; episode += 1) {
    const episodeSeed = config.seed + episode * 97 + 11;
    const runtime = createRuntime(config, episodeSeed);
    const episodeRandom = mulberry32(episodeSeed + 1);
    let metrics = createInitialMetrics(runtime);
    let totalReward = 0;
    const epsilon = epsilonStart + (epsilonEnd - epsilonStart) * (episode / Math.max(episodes - 1, 1));

    for (let year = 1; year <= config.years; year += 1) {
      const state = encodeState(metrics, year, config.objective);
      const qValues = ensureQRow(qTable, state);
      const actionIndex = chooseEpsilonGreedy(qValues, episodeRandom, epsilon);
      const result = simulateYear(runtime, config, LEARNABLE_POLICIES[actionIndex], year, null);
      const reward = computeReward(result.metrics, config.objective);
      totalReward += reward;

      const nextState = encodeState(result.metrics, Math.min(year + 1, config.years), config.objective);
      const nextMax = Math.max(...ensureQRow(qTable, nextState));
      qValues[actionIndex] += alpha * (reward + gamma * nextMax - qValues[actionIndex]);
      metrics = result.metrics;
    }

    rewards.push(totalReward);
  }

  return {
    summary: {
      algorithm: "Q-learning",
      episodes,
      alpha,
      gamma,
      epsilonStart,
      epsilonEnd,
      averageReward: round2(average(rewards)),
      bestReward: round2(Math.max(...rewards))
    },
    choosePolicy: (year: number, metrics: MacroMetrics) => {
      const state = encodeState(metrics, year, config.objective);
      const qValues = ensureQRow(qTable, state);
      const actionIndex = argmax(qValues);
      const policy = LEARNABLE_POLICIES[actionIndex];
      return {
        year,
        state,
        policyId: policy.id as CorePolicyId,
        policyName: policy.name,
        reward: 0,
        qValues: qValues.map((value) => round2(value))
      };
    }
  };
}

function runEpisode(
  config: ScenarioConfig,
  topPolicy: Policy,
  choosePolicy: (year: number, metrics: MacroMetrics) => RLPolicyTrace
): { frames: StepSnapshot[]; highlights: string[]; finalSummary: string; policyTrace: RLPolicyTrace[] } {
  const runtime = createRuntime(config, config.seed);
  const frames: StepSnapshot[] = [];
  const highlights: string[] = [];
  const policyTrace: RLPolicyTrace[] = [];
  let metrics = createInitialMetrics(runtime);

  for (let year = 1; year <= config.years; year += 1) {
    const yearlyDecision = choosePolicy(year, metrics);
    const policy = getPolicyById(yearlyDecision.policyId);
    const result = simulateYear(runtime, config, policy, year, frames);
    const reward = computeReward(result.metrics, config.objective);
    policyTrace.push({
      ...yearlyDecision,
      reward: round2(reward)
    });

    metrics = result.metrics;
    if (year === 3 || year === 6 || year === config.years) {
      highlights.push(
        `第 ${year} 年：${policy.name} 下 ${ROLE_LABELS[result.leader.role]} A${result.leader.id + 1} 暂时领先，财富 ${result.leader.wealth.toFixed(1)}，累计种树 ${result.leader.plantedTrees}。`
      );
    }
  }

  const final = frames[frames.length - 1];
  const richest = [...final.agents].sort((a, b) => b.wealth - a.wealth)[0];
  const poorest = [...final.agents].sort((a, b) => a.wealth - b.wealth)[0];
  const totalPlanted = final.agents.reduce((sum, agent) => sum + agent.plantedTrees, 0);
  const finalSummary =
    `${topPolicy.name} 驱动下，最终社会福利 ${metrics.welfare.toFixed(2)}，平等度 ${metrics.equality.toFixed(2)}，` +
    `生产力 ${metrics.productivity.toFixed(2)}，生态指数 ${metrics.ecology.toFixed(2)}。` +
    `财富最高的 A${richest.id + 1} 为 ${richest.wealth.toFixed(1)}，最低为 ${poorest.wealth.toFixed(1)}，` +
    `全局共完成 ${totalPlanted} 次种树，说明该策略` +
    (metrics.equality > 0.6 ? "更偏向控制分化并维持资源恢复。" : "更偏向竞争和高回报行为。");

  return {
    frames,
    highlights,
    finalSummary,
    policyTrace
  };
}

export function inferScenarioFromPrompt(prompt: string): Partial<ScenarioConfig> {
  const text = prompt.trim();
  const config: Partial<ScenarioConfig> = {};

  const chineseDigits: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    十一: 11,
    十二: 12,
    十三: 13,
    十四: 14,
    十五: 15,
    十六: 16,
    十七: 17,
    十八: 18,
    十九: 19,
    二十: 20,
    二十一: 21,
    二十二: 22,
    二十三: 23,
    二十四: 24,
    二十五: 25,
    二十六: 26,
    二十七: 27,
    二十八: 28,
    二十九: 29,
    三十: 30,
    三十一: 31,
    三十二: 32
  };

  const parseLooseNumber = (token: string | undefined): number | null => {
    if (!token) {
      return null;
    }
    const numeric = Number(token);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    return chineseDigits[token] ?? null;
  };

  const pickNumber = (patterns: RegExp[]): number | null => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const value = parseLooseNumber(match?.[1]);
      if (value !== null) {
        return value;
      }
    }
    return null;
  };

  if (/强化学习|Q-learning|RL|学习策略|自动调税/.test(text)) {
    config.policyId = "rl_planner";
  } else if (/自由市场|低税|放松管制/.test(text)) {
    config.policyId = "free_market";
  } else if (/AI Economist|论文策略|均衡税制/.test(text)) {
    config.policyId = "ai_economist";
  } else if (/累进税|递进税/.test(text)) {
    config.policyId = "progressive";
  } else if (/公平优先|缩小差距|重分配/.test(text)) {
    config.policyId = "equality_first";
  } else if (/效率优先|高产出|增长优先/.test(text)) {
    config.policyId = "productivity_first";
  }

  if (/公平|均衡|差距|基尼/.test(text)) {
    config.objective = "equality";
    config.policyId ??= "equality_first";
  }
  if (/效率|产出|增长|生产/.test(text)) {
    config.objective = "productivity";
    config.policyId ??= "productivity_first";
  }
  if (/折中|平衡|综合|兼顾|稳/.test(text)) {
    config.objective = "balance";
    config.policyId ??= "ai_economist";
  }
  if (/种树|生态|森林|可持续|恢复/.test(text)) {
    config.policyId ??= "ai_economist";
    config.objective ??= "balance";
    config.resourceDensity ??= 0.34;
  }

  const agentCount = pickNumber([
    /([0-9]+|[一二两三四五六七八九十]+)\s*(?:个)?(?:agent|智能体|居民|人)/i,
    /agent\s*数量\s*([0-9]+|[一二两三四五六七八九十]+)/i
  ]);
  if (agentCount !== null) {
    config.agentCount = clamp(Math.round(agentCount), 4, 10);
  }

  const years = pickNumber([
    /仿真\s*([0-9]+|[一二两三四五六七八九十]+)\s*年/,
    /([0-9]+|[一二两三四五六七八九十]+)\s*年(?:实验|仿真)?/
  ]);
  if (years !== null) {
    config.years = clamp(Math.round(years), 6, 14);
  }

  const stepsPerYear = pickNumber([
    /每年\s*([0-9]+|[一二两三四五六七八九十]+)\s*步/,
    /([0-9]+|[一二两三四五六七八九十]+)\s*步\s*\/?\s*年/
  ]);
  if (stepsPerYear !== null) {
    config.stepsPerYear = clamp(Math.round(stepsPerYear), 16, 32);
  }

  const densityPercent = pickNumber([/资源密度\s*([0-9]+(?:\.[0-9]+)?)\s*%/]);
  if (densityPercent !== null) {
    config.resourceDensity = clamp(densityPercent / 100, 0.18, 0.42);
  }

  const densityDecimal = pickNumber([/资源密度\s*([0-9]+(?:\.[0-9]+)?)/]);
  if (densityDecimal !== null && densityDecimal <= 1) {
    config.resourceDensity = clamp(densityDecimal, 0.18, 0.42);
  }

  if (/资源密一点|资源丰富|高资源|更热闹|更丰富/.test(text)) {
    config.resourceDensity = 0.36;
  }
  if (/资源稀疏|低资源|资源少一点/.test(text)) {
    config.resourceDensity = 0.22;
  }

  if (/课堂展示|大作业|可视化|更明显|更好看/.test(text)) {
    config.agentCount ??= 8;
    config.years ??= 12;
    config.stepsPerYear ??= 28;
    config.resourceDensity ??= 0.34;
    config.objective ??= "balance";
    config.policyId ??= "rl_planner";
  }

  if (/短实验|快速|先跑快一点/.test(text)) {
    config.years = 6;
    config.stepsPerYear = 18;
  }

  if (/长实验|更稳定|充分训练/.test(text)) {
    config.years = 14;
    config.stepsPerYear = 32;
  }

  if (config.policyId === "rl_planner") {
    config.agentCount ??= 8;
    config.years ??= 12;
    config.stepsPerYear ??= 28;
    config.resourceDensity ??= 0.34;
  } else if (config.objective === "equality") {
    config.agentCount ??= 8;
    config.years ??= 12;
    config.stepsPerYear ??= 24;
    config.resourceDensity ??= 0.3;
  } else if (config.objective === "productivity") {
    config.agentCount ??= 10;
    config.years ??= 10;
    config.stepsPerYear ??= 30;
    config.resourceDensity ??= 0.32;
  } else if (config.objective === "balance") {
    config.agentCount ??= 8;
    config.years ??= 10;
    config.stepsPerYear ??= 26;
    config.resourceDensity ??= 0.3;
  }

  if (Object.keys(config).length === 0) {
    config.objective = "balance";
    config.policyId = "rl_planner";
    config.agentCount = 8;
    config.years = 12;
    config.stepsPerYear = 28;
    config.resourceDensity = 0.32;
  }

  return config;
}

export function createDefaultConfig(): ScenarioConfig {
  return {
    seed: 7,
    years: 10,
    stepsPerYear: 24,
    mapWidth: 18,
    mapHeight: 12,
    agentCount: 6,
    resourceDensity: 0.28,
    objective: "balance",
    policyId: "rl_planner",
    prompt: "我想用强化学习自动调税，做一个兼顾公平、效率与生态恢复的政策实验，并能看到谁在种树、交易和建房。"
  };
}

export function runSimulation(config: ScenarioConfig): SimulationRun {
  if (config.policyId === "rl_planner") {
    const trainedPlanner = trainQLearningPlanner(config);
    const run = runEpisode(config, RL_POLICY, trainedPlanner.choosePolicy);
    return {
      config,
      policy: RL_POLICY,
      frames: run.frames,
      highlights: run.highlights,
      finalSummary: run.finalSummary,
      rlTraining: {
        ...trainedPlanner.summary,
        policyTrace: run.policyTrace
      }
    };
  }

  const topPolicy = getPolicyById(config.policyId);
  const run = runEpisode(config, topPolicy, (year, metrics) => ({
    year,
    state: encodeState(metrics, year, config.objective),
    policyId: topPolicy.id as CorePolicyId,
    policyName: topPolicy.name,
    reward: 0,
    qValues: []
  }));

  return {
    config,
    policy: topPolicy,
    frames: run.frames,
    highlights: run.highlights,
    finalSummary: run.finalSummary,
    rlTraining: null
  };
}

export function roleLabel(role: AgentRole): string {
  return ROLE_LABELS[role];
}

export function actionLabel(action: ActionType): string {
  return actionVerb(action);
}
