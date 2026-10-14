import { useEffect, useState } from 'react';
import { Activity, Swords } from 'lucide-react';
import { Card, Button, Spinner } from '../components/ui';
import { userService } from '../services/userService';
import { VueBattleActivityFeed } from '../components/vue/VueBattleActivityFeed';
import { Link } from 'react-router-dom';

export function ActivityFeedPage() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBattles() {
      try {
        setLoading(true);
        const data = await userService.getMyBattles({ limit: 10 });
        setBattles(data.battles || []);
      } catch (err) {
        console.warn('Could not load user battles, using simulated feed:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBattles();
  }, []);

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
              Vue 3 Integration
            </span>
          </div>
          <h1 className="page-title">Live Battle Activity Feed</h1>
          <p className="page-subtitle">
            Powered by embedded Vue.js custom directives (<code>v-uppercase-click</code>, <code>v-dynamic-list</code>, <code>v-date-format</code>).
          </p>
        </div>
        <div className="header-actions">
          <Link to="/battles">
            <Button variant="primary">
              <Swords size={16} />
              <span>Start Battle</span>
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        {loading ? (
          <Spinner label="Loading battle feed..." />
        ) : (
          <VueBattleActivityFeed initialBattles={battles} />
        )}
      </Card>
    </div>
  );
}
