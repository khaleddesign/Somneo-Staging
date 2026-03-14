import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | SomnoConnect',
}

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-display text-midnight mb-8">Politique de Confidentialité</h1>
        
        <div className="space-y-6 text-gray-600 font-body">
          <p className="lead">
            La protection de vos données personnelles et notamment des données de santé 
            (PHI) est au cœur de nos priorités.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">1. Données collectées</h2>
            <p>Nous collectons et traitons les données suivantes :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Données d'identification des professionnels (nom, email, rôle, institution).</li>
              <li>Données des dossiers de polysomnographie et polygraphie.</li>
              <li>Références patients pseudonymisées (cryptées au repos avec AES-256).</li>
              <li>Rapports d'analyse finaux (PDF signés).</li>
              <li>Logs d'accès et d'action (Audit trails).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">2. Finalité du traitement</h2>
            <p>
              Ces données sont nécessaires à la fourniture de notre service d'analyse 
              de sommeil B2B. Elles permettent l'échange sécurisé entre prescripteurs 
              et analystes, ainsi que la facturation du service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">3. Sécurité et Hébergement</h2>
            <p>
              Toutes les données sont chiffrées en transit (TLS/HTTPS) et au repos. 
              Les références patients sensibles sont chiffrées au niveau applicatif 
              avant insertion en base. 
            </p>
            <p className="mt-2">
              L'accès aux études est cloisonné strictement par institution et par droit d'accès 
              spécifique via des politiques RLS (Row Level Security) vérifiées côté serveur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">4. Rétention des données</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Les fichiers source EDF sont conservés pour analyse et seront <strong>définitivement supprimés 72 heures</strong> après la clôture de l'étude.</li>
              <li>Les rapports d'analyse au format PDF sont conservés indéfiniment à disposition du prescripteur.</li>
              <li>Les données d'un compte peuvent être supprimées sur simple demande administrative.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">5. Vos droits (RGPD)</h2>
            <p>
              Conformément à la réglementation européenne (RGPD), vous disposez d'un droit 
              d'accès, de rectification, d'effacement, de limitation, et de portabilité de 
              vos données. Pour exercer vos droits, contactez notre DPO à : <a href="mailto:dpo@somnoventis.com" className="text-teal hover:underline">dpo@somnoventis.com</a>.
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
