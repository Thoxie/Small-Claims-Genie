import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const faqsEn = [
  { q: "How does Small Claims Genie help people file small claims cases?", a: "Small Claims Genie turns the small-claims process into a guided workflow. You answer structured questions, and Small Claims Genie organizes the facts, calculates what's needed, and prepares court-ready documents so you're not hunting for the right forms, rules, and steps on your own." },
  { q: "Do I need a lawyer to use Small Claims Genie?", a: "No. Small claims court is designed so people can represent themselves. Small Claims Genie is built to guide you through the process without needing to hire an attorney, while helping you prepare a clean, organized presentation for court." },
  { q: "Can Small Claims Genie help me understand whether I have a strong case?", a: "Small Claims Genie can help analyze the facts you provide and highlight missing information or evidence that may strengthen your claim. While it cannot guarantee an outcome, it helps you organize the case so the key points are clear and supported." },
  { q: "What evidence should I collect before filing?", a: "Strong cases rely on clear documentation. Useful evidence may include receipts, contracts, text messages, emails, photos, repair estimates, invoices, and payment records. Small Claims Genie helps you organize these materials into a clear timeline so a judge can quickly understand what happened." },
  { q: "How much does it cost to file a case?", a: "Filing fees vary by court and by claim amount, and service costs vary depending on location and difficulty. Small Claims Genie's platform fee is separate from court fees and service costs, which are set by the local jurisdiction. In general: Small Claims Genie fee + court filing fee + service cost." },
  { q: "Can I recover court fees if I win?", a: "In many small claims courts, filing fees and certain service costs can be added to your claim and may be awarded if you win. Small Claims Genie helps you track these costs so they can be included properly when preparing your claim." },
  { q: "What is the maximum amount I can sue for?", a: "Small-claims limits are set by each state (and sometimes by court type). Small Claims Genie helps you stay within the limit for the court you're filing in, and if your damages exceed the limit, it can prompt you to choose a strategy — reduce the amount, or consider a different court option." },
  { q: "What is the statute of limitations?", a: "The statute of limitations is the deadline to file. Miss it, and the court may dismiss the case even if your facts are strong. The time limit depends on the claim type (contract, property damage, personal injury, etc.). Small Claims Genie helps you identify deadlines by asking what happened and when it happened." },
  { q: "How do I know the correct court to file in?", a: "Court selection depends on jurisdiction and venue — usually tied to where the defendant is located and where the dispute happened. Small Claims Genie helps you identify the correct court by collecting those key facts and using them to direct the filing to the proper place." },
  { q: "Can I file a case against a business using Small Claims Genie?", a: "Yes. Small claims courts commonly allow cases against businesses (contractors, landlords, retailers, and service providers). Small Claims Genie helps you capture the business details, what happened, and what you're asking for — then package it into a clean, court-ready presentation." },
  { q: "What is a demand letter, and why does it matter?", a: "A demand letter is a written request to resolve the issue before filing a lawsuit. It explains what happened, what you want, and gives a clear deadline to pay or fix the problem. Many disputes settle at this step. Small Claims Genie can help generate a professional demand letter that's structured, clear, and easy to support with receipts, messages, and timelines." },
  { q: "Does Small Claims Genie handle service of process?", a: "Every small-claims case requires formal notice to the defendant (service of process). Small Claims Genie guides you through service requirements and can support arranging professional service so the delivery is handled correctly and documented, which is often required before the court will proceed." },
  { q: "Can I settle the case before the hearing?", a: "Yes. Many disputes are resolved before the court date through negotiation or settlement. If both sides agree to a payment or resolution, the case can often be closed without appearing in court. Small Claims Genie helps you prepare your case so you're in a stronger position to negotiate." },
  { q: "What should I expect during the court hearing?", a: "Small claims hearings are usually brief and informal. Each side presents their explanation and evidence to the judge. The judge may ask questions and then decide either immediately or shortly after the hearing. Small Claims Genie helps you organize your presentation so the facts are clear and easy to follow." },
  { q: "How long does a small claims case usually take?", a: "The timeline depends on the court and how quickly the defendant is served. After filing, courts typically schedule hearings several weeks to a few months later. Small Claims Genie helps you prepare everything in advance so you're ready once the court sets the hearing date." },
  { q: "What if the defendant files a counterclaim?", a: "Sometimes the other party may file a claim against you related to the same dispute. If that happens, the court will usually hear both claims at the same hearing. Small Claims Genie helps you organize your response so you can address the counterclaim clearly." },
  { q: "What happens after I win a case?", a: "Winning a judgment means the court agrees the defendant owes you money. If the defendant pays voluntarily, the case is resolved. If they do not pay, additional steps may be required to collect the judgment. Small Claims Genie can help explain the common options available for enforcing a judgment." },
  { q: "What happens if the defendant cannot be found?", a: "Process servers typically attempt service multiple times. If they can't complete service, you may need a better address, a different service location, or additional steps to locate the defendant. Small Claims Genie helps you understand the next best option so the case doesn't stall." },
  { q: "What if I lose the case?", a: "If the court decides against your claim, the case usually ends at that point. In some situations there may be options to appeal or take other legal steps depending on local rules. Small Claims Genie helps you prepare a clear, well-supported case from the start to improve your chances." },
  { q: "Is my information secure when using Small Claims Genie?", a: "Small Claims Genie is designed to handle sensitive information responsibly. The platform stores case details securely and uses them only to help prepare your claim and related documents." },
  { q: "Why use Small Claims Genie instead of filing on your own?", a: "You can file on your own, but it often requires finding the correct forms, understanding court rules, organizing evidence, and completing service properly. Small Claims Genie streamlines this into a guided system so you can focus on what happened and what you can prove, while the platform structures it into court-ready outputs." },
];

const faqsEs = [
  { q: "¿Cómo ayuda Small Claims Genie a presentar casos de reclamaciones menores?", a: "Small Claims Genie convierte el proceso de reclamaciones menores en un flujo de trabajo guiado. Respondes preguntas estructuradas y el sistema organiza los hechos, calcula lo necesario y prepara documentos listos para el tribunal, sin que tengas que buscar los formularios, reglas y pasos correctos por tu cuenta." },
  { q: "¿Necesito un abogado para usar Small Claims Genie?", a: "No. El tribunal de reclamaciones menores está diseñado para que las personas puedan representarse a sí mismas. Small Claims Genie está creado para guiarte en el proceso sin necesidad de contratar un abogado, ayudándote a preparar una presentación limpia y organizada para el tribunal." },
  { q: "¿Puede Small Claims Genie ayudarme a saber si tengo un caso sólido?", a: "Small Claims Genie puede analizar los hechos que proporcionas y resaltar información o evidencia faltante que puede fortalecer tu reclamación. Aunque no puede garantizar un resultado, te ayuda a organizar el caso para que los puntos clave sean claros y estén respaldados." },
  { q: "¿Qué evidencia debo recopilar antes de presentar?", a: "Los casos sólidos dependen de documentación clara. La evidencia útil puede incluir recibos, contratos, mensajes de texto, correos electrónicos, fotos, estimaciones de reparación, facturas y registros de pago. Small Claims Genie te ayuda a organizar estos materiales en una cronología clara para que el juez pueda entender rápidamente qué pasó." },
  { q: "¿Cuánto cuesta presentar un caso?", a: "Las tarifas de presentación varían según el tribunal y el monto de la reclamación, y los costos de notificación varían según la ubicación y la dificultad. La tarifa de la plataforma de Small Claims Genie es independiente de las tarifas del tribunal y los costos de notificación, que son fijados por la jurisdicción local." },
  { q: "¿Puedo recuperar los gastos del tribunal si gano?", a: "En muchos tribunales de reclamaciones menores, las tarifas de presentación y ciertos costos de notificación se pueden agregar a tu reclamación y pueden ser otorgados si ganas. Small Claims Genie te ayuda a rastrear estos costos para que puedan incluirse correctamente." },
  { q: "¿Cuál es el monto máximo por el que puedo demandar?", a: "Los límites de reclamaciones menores son fijados por cada estado. Small Claims Genie te ayuda a mantenerte dentro del límite del tribunal donde presentas, y si tus daños exceden el límite, puede sugerirte una estrategia." },
  { q: "¿Qué es el plazo de prescripción?", a: "El plazo de prescripción es la fecha límite para presentar. Si lo pierdes, el tribunal puede desestimar el caso incluso si tus hechos son sólidos. El límite de tiempo depende del tipo de reclamación. Small Claims Genie te ayuda a identificar las fechas límite preguntando qué pasó y cuándo." },
  { q: "¿Cómo sé en qué tribunal presentar?", a: "La selección del tribunal depende de la jurisdicción y el lugar — generalmente vinculados a donde se encuentra el demandado y donde ocurrió la disputa. Small Claims Genie te ayuda a identificar el tribunal correcto recopilando esos hechos clave." },
  { q: "¿Puedo presentar un caso contra una empresa usando Small Claims Genie?", a: "Sí. Los tribunales de reclamaciones menores comúnmente permiten casos contra empresas (contratistas, propietarios, minoristas y proveedores de servicios). Small Claims Genie te ayuda a capturar los detalles del negocio, qué pasó y qué solicitas, luego lo empaqueta en una presentación lista para el tribunal." },
  { q: "¿Qué es una carta de demanda y por qué importa?", a: "Una carta de demanda es una solicitud escrita para resolver el problema antes de presentar una demanda. Explica qué pasó, qué quieres y da un plazo claro para pagar o solucionar el problema. Muchas disputas se resuelven en este paso. Small Claims Genie puede ayudarte a generar una carta de demanda profesional." },
  { q: "¿Small Claims Genie se encarga de la notificación al demandado?", a: "Cada caso de reclamaciones menores requiere notificación formal al demandado. Small Claims Genie te guía a través de los requisitos de notificación y puede ayudarte a organizar el proceso correctamente." },
  { q: "¿Puedo llegar a un acuerdo antes de la audiencia?", a: "Sí. Muchas disputas se resuelven antes de la fecha del tribunal mediante negociación o acuerdo. Si ambas partes acuerdan un pago o resolución, el caso a menudo puede cerrarse sin comparecer ante el tribunal. Small Claims Genie te ayuda a preparar tu caso para que estés en una posición más sólida para negociar." },
  { q: "¿Qué debo esperar durante la audiencia judicial?", a: "Las audiencias de reclamaciones menores suelen ser breves e informales. Cada parte presenta su explicación y evidencia al juez. El juez puede hacer preguntas y luego decidir inmediatamente o poco después. Small Claims Genie te ayuda a organizar tu presentación." },
  { q: "¿Cuánto tiempo suele durar un caso de reclamaciones menores?", a: "El plazo depende del tribunal y de la rapidez con que se notifique al demandado. Después de presentar, los tribunales generalmente programan audiencias varias semanas o meses después. Small Claims Genie te ayuda a preparar todo con anticipación." },
  { q: "¿Qué pasa si el demandado presenta una contrademanda?", a: "A veces la otra parte puede presentar una reclamación contra ti relacionada con la misma disputa. Si eso ocurre, el tribunal generalmente escuchará ambas reclamaciones en la misma audiencia. Small Claims Genie te ayuda a organizar tu respuesta." },
  { q: "¿Qué pasa después de ganar un caso?", a: "Ganar un fallo significa que el tribunal acuerda que el demandado te debe dinero. Si el demandado paga voluntariamente, el caso se resuelve. Si no paga, pueden requerirse pasos adicionales para cobrar el fallo. Small Claims Genie puede explicar las opciones comunes disponibles." },
  { q: "¿Qué pasa si no se puede encontrar al demandado?", a: "Los notificadores generalmente intentan la notificación varias veces. Si no pueden completarla, es posible que necesites una mejor dirección u otros pasos para localizar al demandado. Small Claims Genie te ayuda a entender la mejor opción siguiente." },
  { q: "¿Qué pasa si pierdo el caso?", a: "Si el tribunal decide en contra de tu reclamación, el caso generalmente termina en ese punto. En algunas situaciones puede haber opciones de apelación según las reglas locales. Small Claims Genie te ayuda a preparar un caso claro y bien respaldado desde el principio para mejorar tus posibilidades." },
  { q: "¿Es segura mi información al usar Small Claims Genie?", a: "Small Claims Genie está diseñado para manejar información sensible de manera responsable. La plataforma almacena los detalles del caso de forma segura y los usa únicamente para ayudar a preparar tu reclamación y los documentos relacionados." },
  { q: "¿Por qué usar Small Claims Genie en lugar de presentar por tu cuenta?", a: "Puedes presentar por tu cuenta, pero a menudo requiere encontrar los formularios correctos, entender las reglas del tribunal, organizar la evidencia y completar la notificación correctamente. Small Claims Genie agiliza esto en un sistema guiado para que puedas concentrarte en qué pasó y qué puedes probar." },
];

export default function FAQ() {
  const { lang } = useLanguage();
  const es = lang === "es";
  const faqs = es ? faqsEs : faqsEn;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqsEn.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a },
    })),
  };

  return (
    <>
    <div className="flex flex-col w-full bg-[#f5fdfb] pb-[80px]">
      <Helmet>
        <title>Frequently Asked Questions — Small Claims Genie</title>
        <meta name="description" content="Answers to common questions about filing in small claims court, using AI tools, demand letters, court forms, and the Small Claims Genie platform." />
        <link rel="canonical" href="https://smallclaimsgenie.com/faq" />
        <meta property="og:url" content="https://smallclaimsgenie.com/faq" />
        <meta property="og:title" content="Frequently Asked Questions — Small Claims Genie" />
        <meta property="og:description" content="Answers to common questions about filing in small claims court, using AI tools, demand letters, court forms, and the Small Claims Genie platform." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      {/* ── Header ── */}
      <section className="px-6 pt-10 pb-6 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-primary mb-2">
            {es ? "Preguntas Frecuentes" : "Frequently Asked Questions"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {es
              ? "Respuestas claras a preguntas comunes sobre cómo Small Claims Genie te ayuda a preparar un caso de reclamaciones menores. ¿No ves tu pregunta? Pregunta al Genie abajo — gratis, sin cuenta."
              : "Clear answers to common questions about how Small Claims Genie helps you prepare a small claims case. Don't see your question? Ask the Genie below — free, no account needed."}
          </p>
        </div>
      </section>

      {/* ── FAQ Boxes ── */}
      <section className="px-6 pb-10 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {faqs.map(({ q, a }, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl px-5 py-4 bg-white"
            >
              <p className="text-sm font-bold text-primary mb-1.5">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-12 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto border-2 border-[#a8e6df] rounded-xl px-8 py-8 text-center bg-[#f0fffe]">
          <h2 className="text-lg font-black text-primary mb-1.5">
            {es ? "¿Todavía tienes preguntas?" : "Still have questions?"}
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            {es
              ? "Describe tu situación en español — por voz o texto. El Genie te dirá si tienes un caso, qué evidencia necesitas y exactamente cómo puede ayudarte Small Claims Genie a ganar."
              : "Describe your situation in plain English — by voice or text. The Genie will tell you if you have a case, what evidence you need, and exactly how Small Claims Genie can help you win."}
          </p>
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
