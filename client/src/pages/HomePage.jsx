import { Activity, Swords, Terminal } from 'lucide-react';
import { Avatar, Badge, Button, Card, Input, Spinner } from '../components/ui';
import { APP_NAME } from '../constants/app';

export function HomePage() {
  return (
    <section className="home-page">
      <div className="hero-panel">
        <Badge tone="success">Frontend foundation ready</Badge>
        <h1>{APP_NAME}</h1>
        <p>Real-time coding battles, structured problems, and competitive practice will build on this foundation.</p>
        <div className="hero-actions">
          <Button>Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
        </div>
      </div>

      <div className="foundation-grid" aria-label="Foundation preview">
        <Card>
          <Terminal size={22} />
          <h2>Reusable UI</h2>
          <p>Buttons, inputs, cards, modals, badges, avatars, and spinners are ready for feature screens.</p>
        </Card>
        <Card>
          <Swords size={22} />
          <h2>Routing Ready</h2>
          <p>React Router is separated from app rendering so future pages can be added cleanly.</p>
        </Card>
        <Card>
          <Activity size={22} />
          <h2>Data Layer</h2>
          <p>Axios, TanStack Query, Zustand, and Socket.IO client are configured for future modules.</p>
        </Card>
      </div>

      <Card className="preview-card">
        <div>
          <h2>Component Preview</h2>
          <p>These controls are placeholders for future forms and workflows.</p>
        </div>
        <Input id="preview-input" label="Handle" placeholder="codearena_user" />
        <div className="preview-row">
          <Avatar name="Code Arena" />
          <Badge>Idle</Badge>
          <Spinner />
        </div>
      </Card>
    </section>
  );
}
