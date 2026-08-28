import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';

export default function ForgotPassword() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-sunken px-4">
      <Card className="max-w-md text-center">
        <h1 className="font-display text-lg font-bold text-ink">Réinitialisation à venir</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          La réinitialisation en libre-service n'est pas encore disponible : l'API ne l'expose pas
          encore. En attendant, contactez votre administrateur RPN, qui peut réinitialiser votre accès.
        </p>
        <Link to="/connexion" className="mt-4 inline-block text-[13px] font-extrabold text-accent hover:underline">
          Retour à la connexion
        </Link>
      </Card>
    </div>
  );
}
