import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const typesSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://smallclaimsgenie.com/types-of-cases",
  "name": "Types of Small Claims Cases",
  "description": "Small Claims Genie handles landlord-tenant disputes, contractor fraud, auto accidents, unpaid loans, property damage, and more. See if your case qualifies.",
  "isPartOf": { "@id": "https://smallclaimsgenie.com/#website" },
};

const casesEn = [
  { title: "Personal Loans & IOUs", desc: "Unpaid personal loans, shared expenses, or repayment promises that never happened. We help you organize texts, payment trails, and a timeline that shows the agreement, the amount, and the failure to repay." },
  { title: "Online Purchases", desc: "Non-delivery, counterfeit items, damaged goods, chargeback disputes, or refused refunds. We help you assemble order history, messages, tracking, photos, and the exact amount owed." },
  { title: "Contractors / Home Services", desc: "Incomplete work, poor workmanship, delays, or payment disputes with contractors. We help you document scope, change requests, milestones, invoices, and the cost to finish or fix the work." },
  { title: "Landlord / Tenant Disputes", desc: "Security deposit disputes, unlawful deductions, habitability issues, rent-related disputes, or repair reimbursement. We help you structure move-in/move-out evidence, repair quotes, written notices, and a damages breakdown that's easy for a judge to follow." },
  { title: "Injury (Out-of-Pocket Costs)", desc: "Recover medical bills, treatment costs, replacement costs, and other out-of-pocket expenses from minor incidents. We help you package receipts, medical documentation, and a simple causation narrative that stays focused and credible." },
  { title: "Auto Repair", desc: 'Disputes over bad repairs, overcharging, unauthorized work, "fixed" problems that return, or vehicles returned worse than before. We help you collect invoices, estimates, photos, and any expert notes to support a refund or repair-cost claim.' },
  { title: "Airlines and Travel Problems", desc: "Sue for lost baggage, delays, denied boarding, damaged items, or out-of-pocket expenses. We help you document what happened, what you spent, what you requested from the airline, and how to present it clearly in court." },
  { title: "Airbnb / VRBO / Hotel Issues", desc: "File temporary vacation rental related claims for cancellations, unsafe conditions, property damage, withheld deposits, or misrepresentation. We help you organize messages, photos, receipts, and a clean timeline so your damages are easy to prove." },
];

const casesEs = [
  { title: "Préstamos Personales y Pagarés", desc: "Préstamos personales impagados, gastos compartidos o promesas de pago que nunca ocurrieron. Te ayudamos a organizar mensajes, registros de pago y una cronología que muestre el acuerdo, el monto y el incumplimiento de pago." },
  { title: "Compras en Línea", desc: "No entrega, artículos falsificados, bienes dañados, disputas de contracargo o reembolsos rechazados. Te ayudamos a reunir el historial de pedidos, mensajes, seguimiento, fotos y el monto exacto adeudado." },
  { title: "Contratistas / Servicios para el Hogar", desc: "Trabajo incompleto, mala mano de obra, retrasos o disputas de pago con contratistas. Te ayudamos a documentar el alcance, los cambios de solicitud, los hitos, las facturas y el costo para terminar o reparar el trabajo." },
  { title: "Disputas Arrendador / Inquilino", desc: "Disputas por depósito de seguridad, deducciones ilegales, problemas de habitabilidad, disputas relacionadas con el alquiler o reembolso de reparaciones. Te ayudamos a estructurar la evidencia de entrada/salida, cotizaciones de reparación y avisos escritos." },
  { title: "Lesiones (Gastos de tu Bolsillo)", desc: "Recupera facturas médicas, costos de tratamiento, costos de reemplazo y otros gastos de tu bolsillo por incidentes menores. Te ayudamos a empaquetar recibos, documentación médica y una narrativa simple de causalidad." },
  { title: "Reparación de Autos", desc: 'Disputas por reparaciones deficientes, cobros excesivos, trabajo no autorizado, problemas "reparados" que regresan o vehículos devueltos en peores condiciones. Te ayudamos a recopilar facturas, estimaciones, fotos y notas de expertos.' },
  { title: "Problemas con Aerolíneas y Viajes", desc: "Demanda por equipaje perdido, retrasos, denegación de embarque, artículos dañados o gastos de tu bolsillo. Te ayudamos a documentar qué pasó, qué gastaste, qué solicitaste a la aerolínea y cómo presentarlo claramente en el tribunal." },
  { title: "Problemas con Airbnb / VRBO / Hotel", desc: "Presenta reclamaciones por cancelaciones, condiciones inseguras, daños a la propiedad, depósitos retenidos o información falsa. Te ayudamos a organizar mensajes, fotos, recibos y una cronología limpia para que tus daños sean fáciles de probar." },
];

export default function TypesOfCases() {
  const { lang } = useLanguage();
  const es = lang === "es";
  const cases = es ? casesEs : casesEn;

  return (
    <>
    <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
      <Helmet>
        <title>Types of Cases — Small Claims Genie</title>
        <meta name="description" content="Small Claims Genie handles landlord-tenant disputes, contractor fraud, auto accidents, unpaid loans, property damage, and more. See if your case qualifies." />
        <link rel="canonical" href="https://smallclaimsgenie.com/types-of-cases" />
        <meta property="og:url" content="https://smallclaimsgenie.com/types-of-cases" />
        <meta property="og:title" content="Types of Cases — Small Claims Genie" />
        <meta property="og:description" content="Small Claims Genie handles landlord-tenant disputes, contractor fraud, auto accidents, unpaid loans, property damage, and more. See if your case qualifies." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify(typesSchema)}</script>
      </Helmet>

      {/* Header */}
      <section className="px-6 pt-10 pb-4 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-primary mb-2">
            {es ? "Tipos de Reclamaciones Menores" : "Types of Small Claims"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">
            {es ? (
              <>Small Claims Genie te ayuda a navegar el tribunal de reclamaciones menores identificando la jurisdicción y el lugar correctos, organizando tu evidencia con el Genie de IA para crear un caso sólido. El Genie de IA prepara documentos listos para presentar en minutos, crea una declaración refinada para leer al juez, realiza audiencias simuladas con IA para que puedas practicar, guía todos los pasos de notificación y te prepara para el tribunal.{" "}<span className="font-semibold text-primary">Recupera tu dinero.</span></>
            ) : (
              <>Small Claims Genie helps you navigate small claims court by identifying the right jurisdiction and venue, organizing your evidence using our AI Genie to create a powerful case. The AI Genie prepares court-ready documents to file in minutes, creates a polished statement to read to the judge, performs mock hearings with AI so you can practice, handles all the guiding service steps, and gets you ready for court.{" "}<span className="font-semibold text-primary">Get your money back.</span></>
            )}
          </p>
          <p className="text-sm font-bold text-primary">
            {es ? "Aquí están algunos de los tipos de disputas más comunes con los que te ayudamos:" : "Here are some of the most common types of disputes we help you prepare:"}
          </p>
        </div>
      </section>

      {/* Case Type Boxes */}
      <section className="px-6 pb-8 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {cases.map(({ title, desc }) => (
              <div key={title} className="border-2 border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="text-sm font-bold text-primary mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-12 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="border-2 border-[#a8e6df] rounded-xl px-6 py-6 bg-[#f0fffe]">
            <p className="text-sm text-[#0d4a44] font-medium mb-1">
              {es ? "¿No estás seguro si tienes un caso?" : "Not sure if you have a case?"}
            </p>
            <p className="text-sm text-muted-foreground">
              {es
                ? "Describe qué pasó en español — por voz o texto. El Genie analizará tu situación, te dirá si califica, qué evidencia necesitas y cómo Small Claims Genie te ayudará a ganar."
                : "Describe what happened in plain English — by voice or text. The Genie will analyze your situation, tell you if it qualifies, what evidence you need, and how Small Claims Genie will help you win."}
            </p>
          </div>
        </div>
      </section>

    </div>

    {/* ── Sticky Bottom Genie Button ── */}
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-end pointer-events-none"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingRight: '72px', paddingTop: '12px' }}
    >
      <Button
        size="lg"
        onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
        className="h-[43px] px-[29px] text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg pointer-events-auto"
      >
        <Wand2 className="mr-2 h-[18px] w-[18px]" />
        {es ? "Pregunta al Genie — Gratis" : "Ask the Genie — Free"}
      </Button>
    </div>

    </>
  );
}
