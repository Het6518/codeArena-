import { useEffect, useRef } from 'react';
import { createApp, ref, computed, watch } from 'vue';
import {
  uppercaseClickDirective,
  dynamicListDirective,
  dateFormatDirective,
} from '../../directives/vueDirectives';

/**
 * VueBattleActivityFeed
 * Micro-frontend bridge integrating Vue 3 and custom directives directly
 * into CodeArena's web pages.
 */
export function VueBattleActivityFeed({ initialBattles = [] }) {
  const containerRef = useRef(null);
  const vueAppRef = useRef(null);
  const battlesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Default sample battles if empty
    const defaultData = initialBattles.length > 0 ? initialBattles : [
      {
        roomCode: 'battle-9021',
        result: 'VICTORY',
        opponent: { username: 'binary_sorcerer' },
        problem: { title: 'Two Sum' },
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        solveTimeMs: 42000,
        ratingChange: 16,
      },
      {
        roomCode: 'battle-8974',
        result: 'DEFEAT',
        opponent: { username: 'algo_knight' },
        problem: { title: 'Reverse Linked List' },
        createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        solveTimeMs: 115000,
        ratingChange: -12,
      },
      {
        roomCode: 'battle-8812',
        result: 'VICTORY',
        opponent: { username: 'rust_ace' },
        problem: { title: 'Valid Palindrome' },
        createdAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
        solveTimeMs: 28000,
        ratingChange: 20,
      },
    ];

    // Create Vue 3 application
    const app = createApp({
      setup() {
        const battles = ref([...defaultData]);
        battlesRef.current = battles;

        const onlyWins = ref(false);
        const lastTransformedInfo = ref(null);

        // Handler called when v-uppercase-click fires
        function onTransform(info) {
          lastTransformedInfo.value = `Transformed: "${info.current}"`;
        }

        const dynamicListConfig = computed(() => ({
          items: battles.value,
          emptyText: 'No battles to show in the dynamic list.',
          filter: onlyWins.value ? (b => b.result === 'VICTORY' || b.result === 'WIN') : null,
          renderItem: (b) => {
            const isWin = b.result === 'VICTORY' || b.result === 'WIN';
            const pillClass = isWin ? 'result-pill victory' : 'result-pill defeat';
            const dateStr = b.createdAt || new Date().toISOString();
            
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="${pillClass}">${b.result}</span>
                  <span style="font-weight: 500;">vs ${b.opponent?.username || 'Opponent'}</span>
                  <span style="color: var(--color-muted); font-size: 13px;">&bull; ${b.problem?.title || 'Coding Problem'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 14px; font-size: 12.5px;">
                  <span style="color: var(--color-muted);" title="Exact: ${new Date(dateStr).toLocaleString()}">
                    ⏱️ ${formatTimeAgo(dateStr)}
                  </span>
                  ${b.ratingChange ? `<span style="font-weight: 600; color: ${b.ratingChange >= 0 ? 'var(--color-success, #3fb950)' : 'var(--color-danger, #f85149)'}">${b.ratingChange >= 0 ? '+' : ''}${b.ratingChange}</span>` : ''}
                </div>
              </div>
            `;
          },
          onRemove: (item) => {
            battles.value = battles.value.filter(b => b.roomCode !== item.roomCode);
          }
        }));

        function addSimulatedBattle() {
          const opponents = ['byte_master', 'py_wizard', 'stack_overlord', 'async_ninja'];
          const problems = ['Merge Intervals', 'LRU Cache', 'Climbing Stairs', 'Coin Change'];
          const isWin = Math.random() > 0.4;
          const opp = opponents[Math.floor(Math.random() * opponents.length)];
          const prob = problems[Math.floor(Math.random() * problems.length)];
          const delta = isWin ? Math.floor(Math.random() * 15) + 10 : -(Math.floor(Math.random() * 12) + 8);

          battles.value.unshift({
            roomCode: `battle-${Math.floor(Math.random() * 9000) + 1000}`,
            result: isWin ? 'VICTORY' : 'DEFEAT',
            opponent: { username: opp },
            problem: { title: prob },
            createdAt: new Date().toISOString(),
            solveTimeMs: Math.floor(Math.random() * 60000) + 20000,
            ratingChange: delta,
          });
        }

        function toggleWinsFilter() {
          onlyWins.value = !onlyWins.value;
        }

        return {
          battles,
          onlyWins,
          dynamicListConfig,
          addSimulatedBattle,
          toggleWinsFilter,
          lastTransformedInfo,
          onTransform
        };
      },
      template: `
        <div class="vue-embedded-card" style="margin-top: 16px;">
          <!-- Card Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="margin: 0; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <span>⚡ Vue.js Live Activity Feed</span>
              </h3>
              <span class="badge" style="background: rgba(63, 185, 80, 0.15); color: #3fb950; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                Directives Active
              </span>
            </div>

            <!-- Controls -->
            <div style="display: flex; gap: 8px; align-items: center;">
              <button 
                type="button"
                @click="toggleWinsFilter" 
                class="btn-secondary" 
                style="padding: 4px 10px; font-size: 12px; border-radius: 4px; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); cursor: pointer;"
              >
                {{ onlyWins ? 'Show All' : '🏆 Wins Only' }}
              </button>
              <button 
                type="button"
                @click="addSimulatedBattle" 
                class="btn-primary" 
                style="padding: 4px 10px; font-size: 12px; border-radius: 4px; border: 1px solid var(--color-accent); background: var(--color-accent); color: #fff; cursor: pointer;"
              >
                + New Battle
              </button>
            </div>
          </div>

          <!-- Section I Directive Demonstration: v-uppercase-click -->
          <div style="background: var(--color-surface); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--color-border-subtle); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px;">
              <span style="color: var(--color-muted);">Click to uppercase:</span>
              <span v-uppercase-click.toggle="onTransform" style="font-family: monospace; padding: 2px 6px; background: var(--color-card); border: 1px dashed var(--color-accent); border-radius: 4px; cursor: pointer;" title="Click to toggle uppercase">
                #arena-room-quickmatch
              </span>
              <span v-uppercase-click.toggle="onTransform" style="font-family: monospace; padding: 2px 6px; background: var(--color-card); border: 1px dashed var(--color-accent); border-radius: 4px; cursor: pointer;" title="Click to toggle uppercase">
                challenger_zero
              </span>
            </div>
            <span v-if="lastTransformedInfo" style="font-size: 11.5px; color: var(--color-accent); font-family: monospace;">
              {{ lastTransformedInfo }}
            </span>
          </div>

          <!-- Section II Directive Demonstration: v-dynamic-list -->
          <ul 
            v-dynamic-list.animated.badges.striped="dynamicListConfig"
            style="list-style: none; padding: 0; margin: 0;"
          ></ul>

          <!-- Section III Directive Demonstration: v-date-format Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--color-border-subtle); font-size: 11.5px; color: var(--color-muted);">
            <div>
              Auto-updating via <code>v-date-format</code>
            </div>
            <div>
              Current feed check: <span v-date-format:time="new Date()"></span> (<span v-date-format:compact="new Date()"></span>)
            </div>
          </div>
        </div>
      `,
    });

    // Register our three custom Vue directives
    app.directive('uppercase-click', uppercaseClickDirective);
    app.directive('dynamic-list', dynamicListDirective);
    app.directive('date-format', dateFormatDirective);

    // Mount to the DOM node inside React!
    app.mount(containerRef.current);
    vueAppRef.current = app;

    return () => {
      if (vueAppRef.current) {
        vueAppRef.current.unmount();
        vueAppRef.current = null;
      }
    };
  }, []);

  // Sync React prop updates to Vue's reactive ref
  useEffect(() => {
    if (battlesRef.current && initialBattles && initialBattles.length > 0) {
      battlesRef.current.value = [...initialBattles];
    }
  }, [initialBattles]);

  return <div ref={containerRef} className="vue-integration-wrapper" />;
}

function formatTimeAgo(isoDate) {
  if (!isoDate) return 'just now';
  const sec = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
