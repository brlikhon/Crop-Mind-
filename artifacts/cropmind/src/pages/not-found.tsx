import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h1 className="text-4xl font-extrabold mb-2 text-foreground">404</h1>
      <h2 className="text-xl font-medium text-muted-foreground mb-8">Field Not Found</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The agricultural sector you are looking for doesn't exist in our current map. It may have been moved or removed.
      </p>
      <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:shadow-lg transition-all">
        Return to Dashboard
      </Link>
    </div>
  );
}
