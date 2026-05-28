import { useEffect, useMemo, useRef, useState } from "react";
import {
  POLICIES,
  actionLabel,
  createDefaultConfig,
  inferScenarioFromPrompt,
  roleLabel,
  runSimulation,
  type ActionType,
  type AgentState,
  type ObjectiveId,
  type PolicyId,
  type ScenarioConfig,
  type SimulationRun,
  type StepSnapshot
} from "./simulation";

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

type SparklineProps = {
  values: number[];
  color: string;
};

type ScenarioPreset = {
  id: string;
  label: string;
  description: string;
  config: Partial<ScenarioConfig>;
};

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  balance: "平衡公平与效率",
  equality: "优先缩小差距",
  productivity: "优先提升产出"
};

const OBJECTIVE_BASELINE_POLICY: Record<ObjectiveId, Exclude<PolicyId, "rl_planner">> = {
  balance: "ai_economist",
  equality: "equality_first",
  productivity: "productivity_first"
};

const CONFIG_FIELD_LABELS = {
  prompt: "实验描述",
  objective: "目标函数",
  policyId: "政策模板",
  agentCount: "Agent 数量",
  resourceDensity: "资源密度",
  years: "仿真年份",
  stepsPerYear: "每年步数"
} as const;

const POLICY_LABELS = Object.fromEntries(POLICIES.map((policy) => [policy.id, policy.name])) as Record<PolicyId, string>;

const ACTION_COLORS: Record<ActionType, string> = {
  harvest: "#7ce38b",
  mine: "#9fbefb",
  plant: "#53c7b9",
  build: "#f0b454",
  trade: "#ffb066",
  move: "#8ea4b1",
  rest: "#a4b1b7"
};

const LEARNABLE_POLICY_OPTIONS = POLICIES.filter((policy) => policy.id !== "rl_planner");

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "equality_demo",
    label: "公平优先",
    description: "突出再分配与缩小差距",
    config: {
      objective: "equality",
      policyId: "equality_first",
      agentCount: 8,
      years: 12,
      stepsPerYear: 24,
      resourceDensity: 0.3,
      prompt: "观察公平优先政策下，多智能体财富差距是否会明显收敛。"
    }
  },
  {
    id: "productivity_demo",
    label: "效率优先",
    description: "突出高产出与交易活跃",
    config: {
      objective: "productivity",
      policyId: "productivity_first",
      agentCount: 10,
      years: 10,
      stepsPerYear: 30,
      resourceDensity: 0.32,
      prompt: "观察效率优先政策下，建造与交易是否会显著提升总产出。"
    }
  },
  {
    id: "rl_demo",
    label: "RL 调节",
    description: "展示年度政策学习与切换",
    config: {
      objective: "balance",
      policyId: "rl_planner",
      agentCount: 8,
      years: 12,
      stepsPerYear: 28,
      resourceDensity: 0.34,
      prompt: "使用 Q-learning 做年度政策调节，对比固定模板下的长期表现。"
    }
  }
];

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function ResourceIcon({
  kind,
  stage,
  regrowIn = 0
}: {
  kind: "tree" | "stone";
  stage: "sapling" | "mature";
  regrowIn?: number;
}) {
  if (kind === "stone") {
    return (
      <i className="resource-glyph resource-glyph-stone" aria-hidden="true">
        <span className="stone-main" />
        <span className="stone-side" />
      </i>
    );
  }

  if (stage === "sapling") {
    const growth = Math.max(0.5, Math.min(1, 1 - regrowIn * 0.12));
    return (
      <i className="resource-glyph resource-glyph-sapling" aria-hidden="true" style={{ transform: `scale(${growth})` }}>
        <span className="sapling-leaf sapling-leaf-left" />
        <span className="sapling-leaf sapling-leaf-right" />
        <span className="sapling-stem" />
      </i>
    );
  }

  return (
    <i className="resource-glyph resource-glyph-tree" aria-hidden="true">
      <span className="tree-crown tree-crown-left" />
      <span className="tree-crown tree-crown-right" />
      <span className="tree-crown tree-crown-top" />
      <span className="tree-trunk" />
    </i>
  );
}

function MarketIcon() {
  return (
    <i className="market-glyph market-icon" aria-hidden="true">
      <span className="market-awning" />
      <span className="market-roof" />
      <span className="market-pole market-pole-left" />
      <span className="market-pole market-pole-right" />
      <span className="market-counter" />
    </i>
  );
}

function HouseIcon({ compact = false }: { compact?: boolean }) {
  return (
    <i className={["house-icon", compact ? "house-icon-compact" : ""].join(" ")} aria-hidden="true">
      <span className="house-roof" />
      <span className="house-body" />
      <span className="house-door" />
    </i>
  );
}

function ActionIcon({ action }: { action: ActionType }) {
  return (
    <i className={`action-icon action-icon-${action}`} aria-hidden="true">
      {action === "harvest" ? (
        <>
          <span className="action-tool action-tool-handle" />
          <span className="action-tool action-tool-blade" />
        </>
      ) : null}
      {action === "mine" ? (
        <>
          <span className="action-tool action-tool-shaft" />
          <span className="action-tool action-tool-pick" />
        </>
      ) : null}
      {action === "plant" ? (
        <>
          <span className="action-seedling action-seedling-leaf-left" />
          <span className="action-seedling action-seedling-leaf-right" />
          <span className="action-seedling-stem" />
        </>
      ) : null}
      {action === "build" ? (
        <>
          <span className="action-block action-block-left" />
          <span className="action-block action-block-right" />
        </>
      ) : null}
      {action === "trade" ? (
        <>
          <span className="action-coin action-coin-left" />
          <span className="action-coin action-coin-right" />
        </>
      ) : null}
      {action === "move" ? (
        <>
          <span className="action-arrow action-arrow-line" />
          <span className="action-arrow action-arrow-head" />
        </>
      ) : null}
      {action === "rest" ? (
        <>
          <span className="action-rest action-rest-main" />
          <span className="action-rest action-rest-tail" />
        </>
      ) : null}
    </i>
  );
}

function Sparkline({ values, color }: SparklineProps) {
  const safeValues = values.length > 1 ? values : [0, 0];
  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const paddedRange = Math.max(maxValue - minValue, 0.06);
  const lowerBound = minValue - paddedRange * 0.12;
  const upperBound = maxValue + paddedRange * 0.12;
  const normalize = (value: number) => (value - lowerBound) / Math.max(upperBound - lowerBound, 0.001);
  const path = safeValues
    .map((value, index) => {
      const x = (index / (safeValues.length - 1)) * 100;
      const y = 100 - normalize(value) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  const latest = safeValues[safeValues.length - 1];

  return (
    <div className="sparkline-shell">
      <div className="sparkline-value">{latest.toFixed(2)}</div>
      <svg viewBox="0 0 100 100" className="sparkline" preserveAspectRatio="none">
        <path d={area} fill={color} opacity="0.12" />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function WealthBars({ agents }: { agents: AgentState[] }) {
  const max = Math.max(...agents.map((agent) => agent.wealth), 1);
  return (
    <div className="wealth-bars">
      {agents.map((agent) => (
        <div key={agent.id} className="wealth-bar">
          <span
            style={{
              background: agent.color,
              height: `${Math.max(18, (agent.wealth / max) * 180)}px`
            }}
          />
          <small>{agent.wealth.toFixed(0)}</small>
          <label>A{agent.id + 1}</label>
        </div>
      ))}
    </div>
  );
}

function PolicyRadar({
  equality,
  productivity,
  marketHeat,
  ecology
}: {
  equality: number;
  productivity: number;
  marketHeat: number;
  ecology: number;
}) {
  const values = [
    { label: "公平", value: equality },
    { label: "产出", value: productivity },
    { label: "市场", value: marketHeat },
    { label: "生态", value: ecology }
  ];

  const polygon = values
    .map((item, index) => {
      const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
      const radius = item.value * 42;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="radar-card">
      <svg viewBox="0 0 100 100" className="radar">
        {[18, 30, 42].map((radius) => (
          <circle key={radius} cx="50" cy="50" r={radius} />
        ))}
        {values.map((item, index) => {
          const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
          const x = 50 + Math.cos(angle) * 48;
          const y = 50 + Math.sin(angle) * 48;
          return <line key={item.label} x1="50" y1="50" x2={x} y2={y} />;
        })}
        <polygon points={polygon} />
      </svg>
      <div className="radar-labels">
        {values.map((item) => (
          <span key={item.label}>
            {item.label}
            <strong>{item.value.toFixed(2)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function EconomyMap({
  frame,
  width,
  height,
  selectedAgentId,
  selectedAgentTrail,
  onSelectAgent
}: {
  frame: StepSnapshot;
  width: number;
  height: number;
  selectedAgentId: number;
  selectedAgentTrail: { x: number; y: number }[];
  onSelectAgent: (id: number) => void;
}) {
  return (
    <div className="map-shell">
      <div
        className="economy-map"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${height}, minmax(34px, 1fr))`
        }}
      >
        {Array.from({ length: width * height }, (_, index) => {
          const x = index % width;
          const y = Math.floor(index / width);
          const resource = frame.resources.find((item) => item.x === x && item.y === y && item.amount > 0);
          const house = frame.houses.find((item) => item.x === x && item.y === y);
          const agent = frame.agents.find((item) => item.x === x && item.y === y);
          const market = x === Math.floor(width / 2) && y === Math.floor(height / 2);
          const marketHot = market && frame.actionSummary.trade > 0;
          const isTrail = selectedAgentTrail.some((point) => point.x === x && point.y === y);

          return (
            <button
              key={`${x}-${y}`}
              type="button"
              className={[
                "cell",
                resource?.kind === "tree" ? "cell-tree" : "",
                resource?.kind === "stone" ? "cell-stone" : "",
                resource?.stage === "sapling" ? "cell-sapling" : "",
                house ? "cell-house" : "",
                market ? "cell-market" : "",
                marketHot ? "cell-market-active" : "",
                isTrail ? "cell-trail" : ""
              ].join(" ")}
              onClick={() => {
                if (agent) {
                  onSelectAgent(agent.id);
                }
              }}
            >
              {market ? <MarketIcon /> : null}
              {resource && !agent ? (
                <ResourceIcon kind={resource.kind} stage={resource.stage} regrowIn={resource.regrowIn} />
              ) : null}
              {house && !agent ? <HouseIcon /> : null}
              {agent ? (
                <div
                  className={["agent-chip", selectedAgentId === agent.id ? "agent-chip-active" : ""].join(" ")}
                  style={{ background: agent.color }}
                >
                  <span>{agent.id + 1}</span>
                  <small>
                    <ActionIcon action={agent.actionType} />
                  </small>
                  {agent.houses > 0 ? (
                    <div className="agent-house-badge">
                      <HouseIcon compact />
                      <b>{agent.houses}</b>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="map-legend">
        <span>树木</span>
        <span>树苗</span>
        <span>矿石</span>
        <span>市场</span>
        <span>Agent</span>
      </div>
      <div className="map-caption">
        <span>微观经济地图</span>
        <small>这里可以直接观察个体行动、资源分布和年度政策变化。</small>
      </div>
    </div>
  );
}

function ActionBreakdown({ frame }: { frame: StepSnapshot }) {
  const entries = Object.entries(frame.actionSummary) as [ActionType, number][];
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="action-breakdown">
      {entries.map(([key, value]) => (
        <div key={key} className="action-row">
          <label>
            <ActionIcon action={key} />
            <span>{actionLabel(key)}</span>
          </label>
          <div className="action-bar-track">
            <span
              className="action-bar-fill"
              style={{
                width: `${(value / max) * 100}%`,
                background: ACTION_COLORS[key]
              }}
            />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function ComparisonPanel({
  currentRun,
  benchmarkRun,
  currentLabel,
  benchmarkLabel
}: {
  currentRun: SimulationRun;
  benchmarkRun: SimulationRun;
  currentLabel: string;
  benchmarkLabel: string;
}) {
  const currentFinal = currentRun.frames[currentRun.frames.length - 1];
  const benchmarkFinal = benchmarkRun.frames[benchmarkRun.frames.length - 1];
  const currentTrees = currentFinal.agents.reduce((sum, agent) => sum + agent.plantedTrees, 0);
  const benchmarkTrees = benchmarkFinal.agents.reduce((sum, agent) => sum + agent.plantedTrees, 0);
  const currentHouses = currentFinal.agents.reduce((sum, agent) => sum + agent.houses, 0);
  const benchmarkHouses = benchmarkFinal.agents.reduce((sum, agent) => sum + agent.houses, 0);
  const metrics = [
    {
      label: "社会福利",
      current: currentFinal.welfare,
      benchmark: benchmarkFinal.welfare
    },
    {
      label: "平等度",
      current: currentFinal.equality,
      benchmark: benchmarkFinal.equality
    },
    {
      label: "生产力",
      current: currentFinal.productivity,
      benchmark: benchmarkFinal.productivity
    },
    {
      label: "生态指数",
      current: currentFinal.ecology,
      benchmark: benchmarkFinal.ecology
    }
  ];

  return (
    <section className="comparison-panel">
      <div className="panel-header">
        <span>实验对比</span>
        <small>同一组参数、同一个随机种子，只替换政策方式</small>
      </div>

      <div className="comparison-grid">
        <article className="comparison-card comparison-card-current">
          <div className="comparison-head">
            <strong>{currentLabel}</strong>
            <small>当前方案</small>
          </div>
          <div className="comparison-card-grid">
            <span>社会福利 {currentFinal.welfare.toFixed(2)}</span>
            <span>平等度 {currentFinal.equality.toFixed(2)}</span>
            <span>生产力 {currentFinal.productivity.toFixed(2)}</span>
            <span>生态指数 {currentFinal.ecology.toFixed(2)}</span>
            <span>建成房屋 {currentHouses}</span>
            <span>累计种树 {currentTrees}</span>
          </div>
        </article>

        <article className="comparison-card">
          <div className="comparison-head">
            <strong>{benchmarkLabel}</strong>
            <small>对照方案</small>
          </div>
          <div className="comparison-card-grid">
            <span>社会福利 {benchmarkFinal.welfare.toFixed(2)}</span>
            <span>平等度 {benchmarkFinal.equality.toFixed(2)}</span>
            <span>生产力 {benchmarkFinal.productivity.toFixed(2)}</span>
            <span>生态指数 {benchmarkFinal.ecology.toFixed(2)}</span>
            <span>建成房屋 {benchmarkHouses}</span>
            <span>累计种树 {benchmarkTrees}</span>
          </div>
        </article>
      </div>

      <div className="comparison-metrics">
        {metrics.map((metric) => {
          const delta = metric.current - metric.benchmark;
          return (
            <div key={metric.label} className="comparison-metric">
              <span>{metric.label}</span>
              <strong>{formatDelta(delta)}</strong>
              <small>{delta >= 0 ? "当前方案更高" : "对照方案更高"}</small>
            </div>
          );
        })}
      </div>

      <div className="comparison-note">
        结论提示：
        {currentFinal.welfare >= benchmarkFinal.welfare
          ? ` 当前方案整体表现更优，尤其在${metrics
              .slice()
              .sort((a, b) => (b.current - b.benchmark) - (a.current - a.benchmark))[0].label}上更占优势。`
          : ` 对照方案整体表现更优，说明当前参数下还可以继续优化策略选择。`}
      </div>
    </section>
  );
}

function ExplainabilityPanel({
  run,
  frame
}: {
  run: SimulationRun;
  frame: StepSnapshot;
}) {
  const currentTrace = run.rlTraining?.policyTrace.find((trace) => trace.year === frame.year) ?? null;

  if (!currentTrace || currentTrace.qValues.length === 0) {
    return (
      <div className="explain-panel">
        <div className="panel-header">
          <span>策略解释</span>
          <small>当前为固定政策模式</small>
        </div>
        <div className="comparison-note">这一年不会在多个候选政策之间切换，因此没有候选分数对比。</div>
      </div>
    );
  }

  const scoredPolicies = LEARNABLE_POLICY_OPTIONS.map((policy, index) => ({
    id: policy.id,
    name: policy.name,
    score: currentTrace.qValues[index] ?? 0,
    selected: policy.id === currentTrace.policyId
  })).sort((a, b) => b.score - a.score);

  return (
    <div className="explain-panel">
      <div className="panel-header">
        <span>策略解释</span>
        <small>为什么今年选这个政策</small>
      </div>
      <div className="explain-topline">
        <span>状态编码：{currentTrace.state}</span>
        <strong>最终选择：{currentTrace.policyName}</strong>
      </div>
      <div className="score-list">
        {scoredPolicies.map((policy) => (
          <div
            key={policy.id}
            className={["score-row", policy.selected ? "score-row-selected" : ""].join(" ")}
          >
            <span>{policy.name}</span>
            <strong>{policy.score.toFixed(2)}</strong>
          </div>
        ))}
      </div>
      <div className="comparison-note">
        解读方式：分数越高，说明在当前宏观状态下，这个政策被估计为更有利于后续长期回报。
      </div>
    </div>
  );
}

function DefenseSummary({
  run,
  frame
}: {
  run: SimulationRun;
  frame: StepSnapshot;
}) {
  const conclusion =
    frame.welfare >= 0.65
      ? "当前实验整体表现稳定，政策组合已经形成较好的公平、产出与生态平衡。"
      : frame.equality >= frame.productivity
        ? "当前实验更偏向公平与生态修复，产出提升还有继续优化空间。"
        : "当前实验更偏向产出与竞争，适合作为效率导向案例。";

  return (
    <div className="defense-summary">
      <div className="panel-header">
        <span>本次实验结论</span>
        <small>答辩时可直接引用</small>
      </div>
      <p>{run.finalSummary}</p>
      <strong>{conclusion}</strong>
    </div>
  );
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildYearlyFrames(run: SimulationRun): StepSnapshot[] {
  return Array.from({ length: run.config.years }, (_, index) => {
    const targetTick = (index + 1) * run.config.stepsPerYear - 1;
    return run.frames[targetTick] ?? run.frames[run.frames.length - 1];
  });
}

function exportRunAsJson(run: SimulationRun) {
  const yearlyFrames = buildYearlyFrames(run);
  const payload = {
    exportedAt: new Date().toISOString(),
    config: run.config,
    policy: run.policy,
    finalSummary: run.finalSummary,
    highlights: run.highlights,
    rlTraining: run.rlTraining,
    agentTraining: run.agentTraining,
    yearlyMetrics: yearlyFrames.map((frame) => ({
      year: frame.year,
      policy: frame.activePolicyName,
      welfare: Number(frame.welfare.toFixed(4)),
      equality: Number(frame.equality.toFixed(4)),
      productivity: Number(frame.productivity.toFixed(4)),
      ecology: Number(frame.ecology.toFixed(4)),
      avgWealth: Number(frame.avgWealth.toFixed(4)),
      totalHouses: frame.houses.length,
      totalPlanted: frame.agents.reduce((sum, agent) => sum + agent.plantedTrees, 0)
    })),
    finalAgents: run.frames[run.frames.length - 1].agents.map((agent) => ({
      id: agent.id,
      role: agent.role,
      wealth: Number(agent.wealth.toFixed(4)),
      houses: agent.houses,
      plantedTrees: agent.plantedTrees,
      wood: agent.wood,
      stone: agent.stone
    }))
  };

  downloadTextFile(
    `ai-economist-run-${run.config.policyId}-${run.config.seed}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
}

function exportRunAsCsv(run: SimulationRun) {
  const yearlyFrames = buildYearlyFrames(run);
  const header = [
    "year",
    "policy",
    "welfare",
    "equality",
    "productivity",
    "ecology",
    "avg_wealth",
    "total_houses",
    "total_planted",
    "agent_wealths"
  ];
  const rows = yearlyFrames.map((frame) => [
    frame.year,
    frame.activePolicyName,
    frame.welfare.toFixed(4),
    frame.equality.toFixed(4),
    frame.productivity.toFixed(4),
    frame.ecology.toFixed(4),
    frame.avgWealth.toFixed(4),
    frame.houses.length,
    frame.agents.reduce((sum, agent) => sum + agent.plantedTrees, 0),
    `"${frame.agents.map((agent) => `${agent.id + 1}:${agent.wealth.toFixed(2)}`).join(" | ")}"`
  ]);
  const content = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  downloadTextFile(`ai-economist-run-${run.config.policyId}-${run.config.seed}.csv`, content, "text/csv;charset=utf-8");
}

function summarizeConfigChanges(previous: ScenarioConfig, next: ScenarioConfig): string[] {
  const changes: string[] = [];

  if (previous.objective !== next.objective) {
    changes.push(`${CONFIG_FIELD_LABELS.objective}：${OBJECTIVE_LABELS[next.objective]}`);
  }
  if (previous.policyId !== next.policyId) {
    changes.push(`${CONFIG_FIELD_LABELS.policyId}：${POLICY_LABELS[next.policyId]}`);
  }
  if (previous.agentCount !== next.agentCount) {
    changes.push(`${CONFIG_FIELD_LABELS.agentCount}：${next.agentCount}`);
  }
  if (previous.years !== next.years) {
    changes.push(`${CONFIG_FIELD_LABELS.years}：${next.years} 年`);
  }
  if (previous.stepsPerYear !== next.stepsPerYear) {
    changes.push(`${CONFIG_FIELD_LABELS.stepsPerYear}：${next.stepsPerYear} 步`);
  }
  if (previous.resourceDensity !== next.resourceDensity) {
    changes.push(`${CONFIG_FIELD_LABELS.resourceDensity}：${next.resourceDensity.toFixed(2)}`);
  }
  if (previous.prompt !== next.prompt) {
    changes.push(CONFIG_FIELD_LABELS.prompt);
  }

  return changes;
}

function App() {
  const [config, setConfig] = useState<ScenarioConfig>(() => createDefaultConfig());
  const [draftConfig, setDraftConfig] = useState<ScenarioConfig>(() => createDefaultConfig());
  const [run, setRun] = useState(() => runSimulation(createDefaultConfig()));
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState(0);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [lastRecommendation, setLastRecommendation] = useState<string[]>([]);
  const [lastAppliedChanges, setLastAppliedChanges] = useState<string[]>([]);
  const [defenseMode, setDefenseMode] = useState(true);
  const recomputeTimerRef = useRef<number | null>(null);

  const frame = run.frames[frameIndex] ?? run.frames[0];
  const historyWindow = run.frames.slice(0, frameIndex + 1);
  const selectedAgent = frame.agents.find((agent) => agent.id === selectedAgentId) ?? frame.agents[0];

  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= run.frames.length - 1) {
          return 0;
        }
        return current + 1;
      });
    }, 280);
    return () => window.clearInterval(timer);
  }, [playing, run.frames.length]);

  useEffect(() => {
    if (!frame.agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(frame.agents[0]?.id ?? 0);
    }
  }, [frame.agents, selectedAgentId]);

  useEffect(() => {
    return () => {
      if (recomputeTimerRef.current !== null) {
        window.clearTimeout(recomputeTimerRef.current);
      }
    };
  }, []);

  const pendingChanges = useMemo(() => summarizeConfigChanges(config, draftConfig), [config, draftConfig]);
  const hasPendingChanges = pendingChanges.length > 0;

  function updateDraftConfig(patch: Partial<ScenarioConfig>) {
    setDraftConfig((current) => ({ ...current, ...patch }));
  }

  function applyScenario(nextConfig: ScenarioConfig, appliedChanges: string[]) {
    if (recomputeTimerRef.current !== null) {
      window.clearTimeout(recomputeTimerRef.current);
    }
    setIsRecomputing(true);
    recomputeTimerRef.current = window.setTimeout(() => {
      const nextRun = runSimulation(nextConfig);
      setConfig(nextConfig);
      setDraftConfig(nextConfig);
      setRun(nextRun);
      setFrameIndex(0);
      setPlaying(true);
      setSelectedAgentId(0);
      setLastAppliedChanges(appliedChanges);
      setIsRecomputing(false);
      recomputeTimerRef.current = null;
    }, 40);
  }

  const insight = useMemo(() => {
    const richest = [...frame.agents].sort((a, b) => b.wealth - a.wealth)[0];
    const busiestBuilder = [...frame.agents].sort((a, b) => b.houses - a.houses)[0];
    const topForester = [...frame.agents].sort((a, b) => b.plantedTrees - a.plantedTrees)[0];
    return [
      `当前领先者是 A${richest.id + 1}，角色为${roleLabel(richest.role)}，财富 ${richest.wealth.toFixed(1)}。`,
      `建造最积极的是 A${busiestBuilder.id + 1}，累计房屋 ${busiestBuilder.houses}。`,
      `生态贡献最高的是 A${topForester.id + 1}，累计种树 ${topForester.plantedTrees}。`,
      frame.note
    ];
  }, [frame]);

  const objectiveText = OBJECTIVE_LABELS[config.objective];
  const isRL = run.rlTraining !== null;
  const comparison = useMemo(() => {
    const benchmarkPolicyId =
      config.policyId === "rl_planner" ? OBJECTIVE_BASELINE_POLICY[config.objective] : "rl_planner";
    const benchmarkRun = runSimulation({
      ...config,
      policyId: benchmarkPolicyId
    });
    return {
      benchmarkRun,
      currentLabel: config.policyId === "rl_planner" ? "Q-learning 调节" : POLICY_LABELS[config.policyId],
      benchmarkLabel: benchmarkPolicyId === "rl_planner" ? "Q-learning 调节" : POLICY_LABELS[benchmarkPolicyId]
    };
  }, [config, run]);

  function handleLaunch() {
    const nextConfig = { ...draftConfig, seed: draftConfig.seed + 1 };
    setLastRecommendation([]);
    applyScenario(nextConfig, summarizeConfigChanges(config, nextConfig));
  }

  function handleSmartPreset() {
    const inferred = inferScenarioFromPrompt(draftConfig.prompt);
    const next = {
      ...draftConfig,
      ...inferred,
      seed: draftConfig.seed + 1
    };
    const changes = summarizeConfigChanges(draftConfig, next);
    setLastRecommendation(changes.length > 0 ? changes : ["这次推荐保持当前参数不变"]);
    applyScenario(next, summarizeConfigChanges(config, next));
  }

  function handleScenarioPreset(preset: ScenarioPreset) {
    const next = {
      ...draftConfig,
      ...preset.config,
      seed: draftConfig.seed + 1
    };
    setLastRecommendation([`已切换到预设场景：${preset.label}`]);
    applyScenario(next, summarizeConfigChanges(config, next));
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI ECONOMIST VISUAL LAB</p>
          <h1>多智能体经济体可视化实验平台</h1>
          <p className="hero-text">
            {defenseMode
              ? "这是一个用于比较固定政策与强化学习调节效果的多智能体经济实验平台。"
              : "支持固定政策对照，也支持基于 Q-learning 的年度政策调节，可以在同一套地图中观察行为、财富和资源变化。"}
          </p>
        </div>
        <div className="hero-stats">
          <MetricCard label="实验目标" value={objectiveText} hint="支持公平、效率与折中三类取向" />
          <MetricCard
            label="当前年份政策"
            value={frame.activePolicyName}
            hint={isRL ? "由 Q-learning 规划器按年度状态选出" : run.policy.summary}
          />
          <MetricCard
            label="回放进度"
            value={`${frameIndex + 1}/${run.frames.length}`}
            hint={`第 ${frame.year} 年 · 第 ${(frame.tick % config.stepsPerYear) + 1} 步`}
          />
        </div>
      </header>

      <main className="dashboard">
        <section className="control-panel glass-panel">
          <div className="panel-header">
            <span>实验配置</span>
            <div className="header-actions">
              <button className="ghost-button" onClick={() => setDefenseMode((value) => !value)}>
                {defenseMode ? "退出答辩模式" : "进入答辩模式"}
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  const next = createDefaultConfig();
                  setConfig(next);
                  setDraftConfig(next);
                  setRun(runSimulation(next));
                  setFrameIndex(0);
                  setPlaying(true);
                  setSelectedAgentId(0);
                  setLastRecommendation([]);
                  setLastAppliedChanges(["已恢复为默认演示参数"]);
                }}
              >
                重置
              </button>
            </div>
          </div>
          <div className="config-status">
            {isRecomputing
              ? "正在按最新参数重算实验与强化学习策略..."
              : hasPendingChanges
                ? `当前有 ${pendingChanges.length} 项参数尚未应用。`
                : "当前实验已经应用最新参数。"}
          </div>
          {hasPendingChanges ? <div className="config-note">{pendingChanges.join(" · ")}</div> : null}
          {lastRecommendation.length > 0 ? (
            <div className="config-note config-note-accent">智能推荐：{lastRecommendation.join(" · ")}</div>
          ) : null}
          {lastAppliedChanges.length > 0 && !hasPendingChanges && !isRecomputing ? (
            <div className="config-note">最近一次已应用：{lastAppliedChanges.join(" · ")}</div>
          ) : null}

          {!defenseMode ? (
            <label className="input-group">
              <span>实验描述</span>
              <textarea
                value={draftConfig.prompt}
                onChange={(event) => updateDraftConfig({ prompt: event.target.value })}
                placeholder="例如：我想观察高税率是否能改善公平性，同时保留一定产出。"
              />
            </label>
          ) : null}

          <div className="preset-group">
            <span>预设场景</span>
            <div className="preset-row">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-chip"
                  type="button"
                  onClick={() => handleScenarioPreset(preset)}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-two">
            <label className="input-group">
              <span>目标函数</span>
              <select
                value={draftConfig.objective}
                onChange={(event) => updateDraftConfig({ objective: event.target.value as ObjectiveId })}
              >
                <option value="balance">平衡公平与效率</option>
                <option value="equality">优先缩小差距</option>
                <option value="productivity">优先提升产出</option>
              </select>
            </label>
            <label className="input-group">
              <span>政策模板</span>
              <select
                value={draftConfig.policyId}
                onChange={(event) => updateDraftConfig({ policyId: event.target.value as PolicyId })}
              >
                {POLICIES.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid-two">
            <label className="input-group">
              <span>Agent 数量</span>
              <div className="range-row">
                <input
                  type="range"
                  min="4"
                  max="10"
                  value={draftConfig.agentCount}
                  onChange={(event) => updateDraftConfig({ agentCount: Number(event.target.value) })}
                />
                <input
                  type="number"
                  min="4"
                  max="10"
                  value={draftConfig.agentCount}
                  onChange={(event) => updateDraftConfig({ agentCount: Number(event.target.value) || 4 })}
                />
              </div>
              <small>已编辑为 {draftConfig.agentCount} 个，应用后生效</small>
            </label>
            <label className="input-group">
              <span>资源密度</span>
              <div className="range-row">
                <input
                  type="range"
                  min="0.18"
                  max="0.42"
                  step="0.02"
                  value={draftConfig.resourceDensity}
                  onChange={(event) => updateDraftConfig({ resourceDensity: Number(event.target.value) })}
                />
                <input
                  type="number"
                  min="0.18"
                  max="0.42"
                  step="0.01"
                  value={draftConfig.resourceDensity}
                  onChange={(event) => updateDraftConfig({ resourceDensity: Number(event.target.value) || 0.18 })}
                />
              </div>
              <small>已编辑为 {draftConfig.resourceDensity.toFixed(2)}，应用后生效</small>
            </label>
          </div>

          <div className="grid-two">
            <label className="input-group">
              <span>仿真年份</span>
              <div className="range-row">
                <input
                  type="range"
                  min="6"
                  max="14"
                  value={draftConfig.years}
                  onChange={(event) => updateDraftConfig({ years: Number(event.target.value) })}
                />
                <input
                  type="number"
                  min="6"
                  max="14"
                  value={draftConfig.years}
                  onChange={(event) => updateDraftConfig({ years: Number(event.target.value) || 6 })}
                />
              </div>
              <small>已编辑为 {draftConfig.years} 年，应用后生效</small>
            </label>
            <label className="input-group">
              <span>每年步数</span>
              <div className="range-row">
                <input
                  type="range"
                  min="16"
                  max="32"
                  value={draftConfig.stepsPerYear}
                  onChange={(event) => updateDraftConfig({ stepsPerYear: Number(event.target.value) })}
                />
                <input
                  type="number"
                  min="16"
                  max="32"
                  value={draftConfig.stepsPerYear}
                  onChange={(event) => updateDraftConfig({ stepsPerYear: Number(event.target.value) || 16 })}
                />
              </div>
              <small>已编辑为 {draftConfig.stepsPerYear} 步，应用后生效</small>
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" onClick={handleLaunch}>
              应用参数并重算
            </button>
            <button className="secondary-button" onClick={handleSmartPreset}>
              智能推荐并应用
            </button>
          </div>
          <div className="button-row">
            <button className="ghost-button" onClick={() => exportRunAsCsv(run)}>
              导出 CSV
            </button>
            <button className="ghost-button" onClick={() => exportRunAsJson(run)}>
              导出 JSON
            </button>
          </div>
        </section>

        <section className="center-stage glass-panel">
          <div className="panel-header">
            <span>经济体实时回放</span>
            <div className="transport">
              <button className="ghost-button" onClick={() => setPlaying((value) => !value)}>
                {playing ? "暂停" : "播放"}
              </button>
              <button
                className="ghost-button"
                onClick={() => setFrameIndex((current) => Math.max(current - 1, 0))}
              >
                上一步
              </button>
              <button
                className="ghost-button"
                onClick={() => setFrameIndex((current) => Math.min(current + 1, run.frames.length - 1))}
              >
                下一步
              </button>
            </div>
          </div>
          <div className="runtime-status">
            当前年份策略：<strong>{frame.activePolicyName}</strong>
            {isRecomputing ? " · 重算中" : playing ? " · 自动回放中" : " · 已暂停"}
            {` · ${config.agentCount} 个 Agent · ${config.years} 年 · 每年 ${config.stepsPerYear} 步`}
          </div>

          <EconomyMap
            frame={frame}
            width={config.mapWidth}
            height={config.mapHeight}
            selectedAgentId={selectedAgent.id}
            selectedAgentTrail={selectedAgent.recentPath}
            onSelectAgent={setSelectedAgentId}
          />

          <input
            className="timeline"
            type="range"
            min="0"
            max={Math.max(run.frames.length - 1, 0)}
            value={frameIndex}
            onChange={(event) => setFrameIndex(Number(event.target.value))}
          />

          <div className="stage-footer">
            <div>
              <span className="footer-label">系统摘要</span>
              <p>{frame.note}</p>
            </div>
            <div className="mini-agents">
              {frame.agents.map((agent) => (
                <span key={agent.id} className="mini-agent-pill" style={{ borderColor: agent.color }}>
                  <b>A{agent.id + 1}</b>
                  <ActionIcon action={agent.actionType} />
                  <em>{agent.lastAction}</em>
                  {agent.houses > 0 ? (
                    <strong>
                      <HouseIcon compact />
                      {agent.houses}
                    </strong>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="insight-panel glass-panel">
          <div className="panel-header">
            <span>策略读数</span>
            <small>{isRL ? "双层 Q-learning 已启用" : "行动 Q-learning 已启用"}</small>
          </div>

          {defenseMode ? <DefenseSummary run={run} frame={frame} /> : null}

          <div className="metrics-grid">
            <MetricCard label="社会福利" value={frame.welfare.toFixed(2)} hint="综合平等、产出与生态后的结果" />
            <MetricCard label="平等度" value={frame.equality.toFixed(2)} hint="越高表示贫富差距越小" />
            <MetricCard label="生产力" value={frame.productivity.toFixed(2)} hint="由采集、交易、建造驱动" />
            <MetricCard label="生态指数" value={frame.ecology.toFixed(2)} hint="树木恢复与林地健康度" />
          </div>

          <PolicyRadar
            equality={frame.equality}
            productivity={frame.productivity}
            marketHeat={frame.marketHeat}
            ecology={frame.ecology}
          />

          <div className="insight-list">
            {insight.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>

          <div className="agent-detail">
            <div className="agent-detail-head">
              <span>选中个体</span>
              <strong style={{ color: selectedAgent.color }}>A{selectedAgent.id + 1}</strong>
            </div>
            <p>{roleLabel(selectedAgent.role)}</p>
            <div className="agent-detail-grid">
              <span className="detail-with-icon">
                <ActionIcon action={selectedAgent.actionType} />
                当前动作：{selectedAgent.lastAction}
              </span>
              <span>财富：{selectedAgent.wealth.toFixed(1)}</span>
              <span>木材：{selectedAgent.wood}</span>
              <span>石材：{selectedAgent.stone}</span>
              <span>树苗库存：{selectedAgent.seeds}</span>
              <span className="detail-with-icon">
                <HouseIcon compact />
                房屋：{selectedAgent.houses}
              </span>
              <span>累计种树：{selectedAgent.plantedTrees}</span>
            </div>
          </div>

          <div className="agent-detail rl-panel">
            <div className="agent-detail-head">
              <span>个体行动学习</span>
              <strong>Q-learning</strong>
            </div>
            <p>每个 Agent 的采集、采石、种树、建造、交易、移动和休整由行动价值表选择。</p>
            <div className="agent-detail-grid">
              <span>训练轮数：{run.agentTraining.episodes}</span>
              <span>状态数量：{run.agentTraining.learnedStates}</span>
              <span>平均回报：{run.agentTraining.averageReward.toFixed(2)}</span>
              <span>探索率：{run.agentTraining.epsilonStart} → {run.agentTraining.epsilonEnd}</span>
            </div>
            <div className="action-breakdown action-breakdown-compact">
              {(Object.entries(run.agentTraining.actionUsage) as [ActionType, number][]).map(([key, value]) => (
                <div key={key} className="action-row">
                  <label>
                    <ActionIcon action={key} />
                    <span>{actionLabel(key)}</span>
                  </label>
                  <div className="action-bar-track">
                    <span
                      className="action-bar-fill"
                      style={{
                        width: `${Math.max(4, (value / Math.max(...Object.values(run.agentTraining.actionUsage), 1)) * 100)}%`,
                        background: ACTION_COLORS[key]
                      }}
                    />
                  </div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          {run.rlTraining ? (
            <div className="agent-detail rl-panel">
              <div className="agent-detail-head">
                <span>强化学习</span>
                <strong>Q-learning</strong>
              </div>
              <p>规划器先训练，再按年份观察状态并选择税收模板。</p>
              <div className="agent-detail-grid">
                <span>训练轮数：{run.rlTraining.episodes}</span>
                <span>平均回报：{run.rlTraining.averageReward.toFixed(2)}</span>
                <span>学习率 α：{run.rlTraining.alpha}</span>
                <span>折扣 γ：{run.rlTraining.gamma}</span>
                <span>起始探索率：{run.rlTraining.epsilonStart}</span>
                <span>结束探索率：{run.rlTraining.epsilonEnd}</span>
              </div>
            </div>
          ) : null}

          <ExplainabilityPanel run={run} frame={frame} />
        </section>

        <section className="analytics glass-panel">
          <div className="panel-header">
            <span>行为分析</span>
            <small>这一屏现在不仅能看行为，还能看 RL 规划器学到了什么</small>
          </div>

          <ComparisonPanel
            currentRun={run}
            benchmarkRun={comparison.benchmarkRun}
            currentLabel={comparison.currentLabel}
            benchmarkLabel={comparison.benchmarkLabel}
          />

          <div className="chart-grid chart-grid-wide">
            <div className="chart-card">
              <span>社会福利趋势</span>
              <Sparkline values={historyWindow.map((item) => item.welfare)} color="#f0b454" />
            </div>
            <div className="chart-card">
              <span>公平性趋势</span>
              <Sparkline values={historyWindow.map((item) => item.equality)} color="#53c7b9" />
            </div>
            <div className="chart-card">
              <span>产出趋势</span>
              <Sparkline values={historyWindow.map((item) => item.productivity)} color="#6fa8ff" />
            </div>
            <div className="chart-card">
              <span>生态恢复趋势</span>
              <Sparkline values={historyWindow.map((item) => item.ecology)} color="#7ce38b" />
            </div>
          </div>

          <div className="analytics-bottom">
            <div className="wealth-card">
              <span>财富分布</span>
              <WealthBars agents={frame.agents} />
            </div>

            <div className="narrative-card">
              <span>实验结论</span>
              <p>{run.finalSummary}</p>
              <ul>
                {run.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="analytics-bottom analytics-bottom-rich">
            <div className="action-card">
              <span>当前回合动作统计</span>
              <ActionBreakdown frame={frame} />
            </div>
            <div className="event-card">
              <span>事件流</span>
              <div className="event-list">
                {frame.events.map((event) => (
                  <p key={event}>{event}</p>
                ))}
              </div>
            </div>
          </div>

          {run.rlTraining ? (
            <div className="analytics-bottom analytics-bottom-rich">
              <div className="action-card">
                <span>年度策略轨迹</span>
                <div className="event-list">
                  {run.rlTraining.policyTrace.map((trace) => (
                    <p key={`${trace.year}-${trace.policyId}`}>
                      第 {trace.year} 年：状态 {trace.state}，选择 {trace.policyName}，即时回报 {trace.reward.toFixed(2)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="event-card">
                <span>当前策略解释</span>
                <div className="event-list">
                  <p>当前年份使用：{frame.activePolicyName}</p>
                  <p>这说明规划器认为当前宏观状态下，这个政策更有利于下一阶段的长期回报。</p>
                  <p>这一模式会根据每年的运行结果继续调整下一年的政策。</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>

    </div>
  );
}

export default App;
