import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions Légales | SomnoConnect',
}

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-display text-midnight mb-8">Mentions Légales</h1>
        
        <div className="space-y-6 text-gray-600 font-body">
          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">1. Éditeur du site</h2>
            <p><strong>SomnoConnect</strong></p>
            <p>SAS au capital de 10 000€</p>
            <p>RCS de Paris B 123 456 789</p>
            <p>Siège social : 123 avenue de la République, 75011 Paris, France</p>
            <p>Email : contact@somnoventis.com</p>
            <p>Directeur de la publication : Khaled Ouertani</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">2. Hébergement physique et données de santé</h2>
            <p>L'application est hébergée sur l'infrastructure serverless Vercel (Union Européenne).</p>
            <p>
              La base de données et le stockage de fichiers sont opérés par <strong>Supabase</strong> 
              sur des serveurs AWS en Europe (Francfort, Allemagne / eu-central-1), 
              respectant les normes strictes de sécurité et de confidentialité.
            </p>
            <p>
              Les données à caractère personnel et les dossiers patients sont hébergés conformément 
              aux directives sur la protection des données de santé (HDS) applicables.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">3. Propriété intellectuelle</h2>
            <p>
              Le site, la marque "SomnoConnect", ainsi que l'ensemble de son contenu 
              (textes, images, logos, architecture, code) sont protégés par le droit de la 
              propriété intellectuelle. Toute reproduction est strictement interdite sans accord écrit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">4. Responsabilité</h2>
            <p>
              L'éditeur s'efforce d'assurer au mieux l'exactitude et la mise à jour des informations 
              diffusées sur ce site, dont il se réserve le droit de corriger le contenu.
              Toutefois, SomnoConnect ne peut être tenu responsable d'une inaccessibilité temporaire 
              de la plateforme ou des pertes de données induites par des événements de force majeure.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-100 text-sm text-gray-400">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>
    </div>
  )
}
