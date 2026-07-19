import { Helmet } from 'react-helmet-async';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Wand2, ArrowRight } from "lucide-react";
import { gtagReportConversion } from "@/lib/gtag";
import { useLanguage } from "@/contexts/language-context";

const howItWorksSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://smallclaimsgenie.com/how-it-works",
  "name": "How Small Claims Genie Works | Small Claims Court Preparation",
  "description": "See how Small Claims Genie helps you organize evidence, build a timeline, calculate damages, create a demand letter, prepare court-ready materials, and practice for your small claims hearing.",
  "isPartOf": { "@id": "https://smallclaimsgenie.com/#website" },
};

const howItWorksFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Do I need to know legal terms to use Small Claims Genie?", "acceptedAnswer": { "@type": "Answer", "text": "No. Small Claims Genie uses plain-English questions to help you explain what happened, upload your evidence, and prepare your case materials." } },
    { "@type": "Question", "name": "Can I use Small Claims Genie before I file?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Small Claims Genie is designed to help you prepare before filing by organizing your facts, evidence, damages, demand letter, and filing checklist." } },
    { "@type": "Question", "name": "Can I use Small Claims Genie after I already filed?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. You can still use Genie to organize evidence, build a timeline, prepare your court statement, review possible defenses, and practice for your hearing." } },
    { "@type": "Question", "name": "Does Small Claims Genie replace a lawyer?", "acceptedAnswer": { "@type": "Answer", "text": "No. Small Claims Genie is legal self-help software. It does not provide legal advice, legal representation, or attorney services." } },
    { "@type": "Question", "name": "What makes Small Claims Genie different from a blank form website?", "acceptedAnswer": { "@type": "Answer", "text": "Small Claims Genie does more than provide blank forms. It guides you through the facts, evidence, timeline, damages, demand letter, court-ready statement, and hearing preparation." } },
  ],
};

const stepsEn = [
  { num: "01", title: "Tell the Genie What Happened", whatYouDo: "Answer plain-English questions about your dispute, who is involved, what happened, when it happened, and what you are owed.", whatGenieDoes: "Turns your answers into the beginning of a structured small claims case file.", whatYouGet: "A clearer starting point for your claim without needing legal jargon." },
  { num: "02", title: "Upload Your Evidence", whatYouDo: "Add receipts, invoices, contracts, photos, screenshots, emails, text messages, and payment records.", whatGenieDoes: "Helps organize the materials around the facts, dates, parties, and damages in your claim.", whatYouGet: "An evidence structure instead of a pile of disconnected files." },
  { num: "03", title: "Genie Reviews the Case", whatYouDo: "Provide the facts and documents you have so Genie can identify the important parts of the dispute.", whatGenieDoes: "Looks for key facts, missing information, important dates, and possible weaknesses in your case.", whatYouGet: "A better understanding of what supports your case and what still needs work." },
  { num: "04", title: "Build the Timeline", whatYouDo: "Confirm the dates, events, communications, payments, promises, and missed deadlines that matter.", whatGenieDoes: "Turns the events into a clean chronological timeline the court can follow.", whatYouGet: "A clearer story that helps explain what happened and why your claim makes sense." },
  { num: "05", title: "Calculate What You Are Owed", whatYouDo: "Enter the amount you are asking for and connect it to invoices, receipts, deposits, property damage, or money owed.", whatGenieDoes: "Breaks your damages into clearer categories and ties the amount to your evidence.", whatYouGet: "A damages breakdown that helps explain your number." },
  { num: "06", title: "Generate a Demand Letter", whatYouDo: "Review the dispute summary, amount requested, deadline, and supporting facts before sending.", whatGenieDoes: "Creates a plain-English demand letter that explains the problem, states what you want, and shows you are prepared.", whatYouGet: "A stronger pre-filing letter that may help resolve the dispute before court." },
  { num: "07", title: "Prepare Court-Ready Materials", whatYouDo: "Review the case summary, filing details, evidence list, and service documents needed for your small claims process.", whatGenieDoes: "Organizes your information into court-ready preparation materials and checklists.", whatYouGet: "A cleaner, more complete case package before filing or before your hearing." },
  { num: "08", title: "Practice for the Hearing", whatYouDo: "Practice explaining your case and answering likely questions from the judge or the other side.", whatGenieDoes: "Runs mock trial-style questions, identifies weak spots, and helps you prepare for follow-up questions.", whatYouGet: "More confidence and less confusion when it is time to speak." },
  { num: "09", title: "Present Your Case Clearly", whatYouDo: "Use your statement, timeline, evidence checklist, and damages breakdown to stay organized.", whatGenieDoes: "Helps you focus on the facts, evidence, and amount you are asking for.", whatYouGet: "A prepared presentation instead of scattered notes and random documents." },
];

const stepsEs = [
  { num: "01", title: "Cuéntale al Genie Qué Pasó", whatYouDo: "Responde preguntas en español sobre tu disputa, quiénes están involucrados, qué pasó, cuándo ocurrió y cuánto te deben.", whatGenieDoes: "Convierte tus respuestas en el inicio de un expediente estructurado de reclamaciones menores.", whatYouGet: "Un punto de partida más claro para tu reclamación sin necesitar términos legales." },
  { num: "02", title: "Sube tu Evidencia", whatYouDo: "Agrega recibos, facturas, contratos, fotos, capturas de pantalla, correos, mensajes de texto y registros de pago.", whatGenieDoes: "Ayuda a organizar los materiales en torno a los hechos, fechas, partes y daños de tu reclamación.", whatYouGet: "Una estructura de evidencia en lugar de un montón de archivos desconectados." },
  { num: "03", title: "El Genie Revisa el Caso", whatYouDo: "Proporciona los hechos y documentos que tienes para que el Genie identifique las partes importantes de la disputa.", whatGenieDoes: "Busca hechos clave, información faltante, fechas importantes y posibles debilidades en tu caso.", whatYouGet: "Una mejor comprensión de lo que respalda tu caso y lo que aún necesita trabajo." },
  { num: "04", title: "Construye la Cronología", whatYouDo: "Confirma las fechas, eventos, comunicaciones, pagos, promesas y plazos incumplidos que importan.", whatGenieDoes: "Convierte los eventos en una cronología limpia que el tribunal puede seguir.", whatYouGet: "Una historia más clara que explica qué pasó y por qué tu reclamación tiene sentido." },
  { num: "05", title: "Calcula lo que te Deben", whatYouDo: "Ingresa la cantidad que solicitas y conéctala con facturas, recibos, depósitos, daños a la propiedad o dinero adeudado.", whatGenieDoes: "Divide tus daños en categorías más claras y vincula la cantidad con tu evidencia.", whatYouGet: "Un desglose de daños que ayuda a explicar tu cifra." },
  { num: "06", title: "Genera una Carta de Demanda", whatYouDo: "Revisa el resumen de la disputa, el monto solicitado, el plazo y los hechos de respaldo antes de enviar.", whatGenieDoes: "Crea una carta de demanda que explica el problema, indica lo que quieres y muestra que estás preparado.", whatYouGet: "Una carta más sólida antes de presentar que puede ayudar a resolver la disputa antes del tribunal." },
  { num: "07", title: "Prepara Materiales Listos para el Tribunal", whatYouDo: "Revisa el resumen del caso, los detalles de presentación, la lista de evidencia y los documentos de notificación necesarios.", whatGenieDoes: "Organiza tu información en materiales de preparación y listas de verificación listos para el tribunal.", whatYouGet: "Un paquete de caso más limpio y completo antes de presentar o de tu audiencia." },
  { num: "08", title: "Practica para la Audiencia", whatYouDo: "Practica explicar tu caso y responder preguntas probables del juez o de la otra parte.", whatGenieDoes: "Realiza preguntas estilo juicio simulado, identifica puntos débiles y te ayuda a prepararte para preguntas de seguimiento.", whatYouGet: "Más confianza y menos confusión cuando llegue el momento de hablar." },
  { num: "09", title: "Presenta tu Caso Claramente", whatYouDo: "Usa tu declaración, cronología, lista de evidencia y desglose de daños para mantenerte organizado.", whatGenieDoes: "Te ayuda a enfocarte en los hechos, evidencia y monto que solicitas.", whatYouGet: "Una presentación preparada en lugar de notas dispersas y documentos al azar." },
];

const casePackageEn = ["Case summary", "Timeline", "Evidence checklist", "Damages breakdown", "Demand letter", "Filing checklist", "Service instructions", "Court-ready statement", "Hearing practice"];
const casePackageEs = ["Resumen del caso", "Cronología", "Lista de evidencia", "Desglose de daños", "Carta de demanda", "Lista de presentación", "Instrucciones de notificación", "Declaración para el tribunal", "Práctica para la audiencia"];

const exampleStepsEn = [
  "Upload the contract, photos, messages, and payment records",
  "Build a timeline of promises, payments, and missed work",
  "Connect the requested amount to the evidence",
  "Practice explaining the claim before the hearing",
];
const exampleStepsEs = [
  "Sube el contrato, fotos, mensajes y registros de pago",
  "Construye una cronología de promesas, pagos y trabajo incompleto",
  "Conecta el monto solicitado con la evidencia",
  "Practica explicar la reclamación antes de la audiencia",
];

const howItWorksFaqsEn = [
  { q: "Do I need to know legal terms to use Small Claims Genie?", a: "No. Small Claims Genie uses plain-English questions to help you explain what happened, upload your evidence, and prepare your case materials." },
  { q: "Can I use Small Claims Genie before I file?", a: "Yes. Small Claims Genie is designed to help you prepare before filing by organizing your facts, evidence, damages, demand letter, and filing checklist." },
  { q: "Can I use Small Claims Genie after I already filed?", a: "Yes. You can still use Genie to organize evidence, build a timeline, prepare your court statement, review possible defenses, and practice for your hearing." },
  { q: "Does Small Claims Genie replace a lawyer?", a: "No. Small Claims Genie is legal self-help software. It does not provide legal advice, legal representation, or attorney services." },
  { q: "What makes Small Claims Genie different from a blank form website?", a: "Small Claims Genie does more than provide blank forms. It guides you through the facts, evidence, timeline, damages, demand letter, court-ready statement, and hearing preparation." },
];
const howItWorksFaqsEs = [
  { q: "¿Necesito conocer términos legales para usar Small Claims Genie?", a: "No. Small Claims Genie usa preguntas en español para ayudarte a explicar qué pasó, subir tu evidencia y preparar los materiales de tu caso." },
  { q: "¿Puedo usar Small Claims Genie antes de presentar?", a: "Sí. Small Claims Genie está diseñado para ayudarte a prepararte antes de presentar organizando tus hechos, evidencia, daños, carta de demanda y lista de verificación." },
  { q: "¿Puedo usar Small Claims Genie después de haber presentado?", a: "Sí. Aún puedes usar el Genie para organizar evidencia, construir una cronología, preparar tu declaración, revisar posibles defensas y practicar para tu audiencia." },
  { q: "¿Small Claims Genie reemplaza a un abogado?", a: "No. Small Claims Genie es software de autoayuda legal. No proporciona asesoramiento legal, representación legal ni servicios de abogado." },
  { q: "¿Qué hace diferente a Small Claims Genie de un sitio con formularios en blanco?", a: "Small Claims Genie hace más que proporcionar formularios en blanco. Te guía a través de los hechos, evidencia, cronología, daños, carta de demanda, declaración para el tribunal y preparación para la audiencia." },
];

export default function HowItWorks() {
  const { lang } = useLanguage();
  const es = lang === "es";
  const steps = es ? stepsEs : stepsEn;
  const casePackage = es ? casePackageEs : casePackageEn;
  const exampleSteps = es ? exampleStepsEs : exampleStepsEn;
  const howItWorksFaqs = es ? howItWorksFaqsEs : howItWorksFaqsEn;

  return (
    <>
    <div className="flex flex-col w-full bg-[#f5fdfb] pb-4">
      <Helmet>
        <title>How Small Claims Genie Works | Small Claims Court Preparation</title>
        <meta name="description" content="See how Small Claims Genie helps you organize evidence, build a timeline, calculate damages, create a demand letter, prepare court-ready materials, and practice for your small claims hearing." />
        <link rel="canonical" href="https://smallclaimsgenie.com/how-it-works" />
        <meta property="og:url" content="https://smallclaimsgenie.com/how-it-works" />
        <meta property="og:title" content="How Small Claims Genie Works | Small Claims Court Preparation" />
        <meta property="og:description" content="See how Small Claims Genie helps you organize evidence, build a timeline, calculate damages, create a demand letter, prepare court-ready materials, and practice for your small claims hearing." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify(howItWorksSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howItWorksFaqSchema)}</script>
      </Helmet>

      {/* ── Hero ── */}
      <section className="px-4 pt-8 pb-6 text-center bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3 text-primary">
            {es ? "Cómo Funciona Small Claims Genie" : "How Small Claims Genie Works"}
          </h1>
          <p className="text-base font-semibold text-primary/70 mb-3">
            {es
              ? "De hechos dispersos a un plan de caso listo para el tribunal, el Genie te guía paso a paso."
              : "From messy facts to a court-ready case plan, Genie walks you through the small claims court preparation process step by step."}
          </p>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-2xl mx-auto">
            {es
              ? "Cada paso ayuda a convertir información dispersa en algo más útil: un resumen del caso, evidencia organizada, una cronología, un desglose de daños, una carta de demanda, preparación para la presentación y práctica para la audiencia."
              : "Each step helps turn scattered information into something more useful: a case summary, organized evidence, a timeline, a damages breakdown, a demand letter, filing preparation, and hearing practice."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              onClick={() => gtagReportConversion()}
              className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
              aria-label={es ? "Comienza tu caso gratis" : "Start your small claims case for free"}
            >
              <Link href="/cases/new">
                <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {es ? "Comenzar tu Caso Gratis" : "Start Your Case Free"}
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
              className="h-12 px-8 text-base rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5"
              aria-label={es ? "Pregunta al Genie gratis" : "Ask the Genie a question for free"}
            >
              {es ? "Pregunta al Genie Gratis" : "Ask the Genie Free"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── 9 Workflow Steps — Vertical Timeline ── */}
      <section className="px-4 pb-4 bg-[#f5fdfb]">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Vertical connecting line — desktop only */}
            <div className="absolute left-[1.75rem] top-8 bottom-8 w-0.5 bg-gray-200 hidden md:block" aria-hidden="true" />

            {steps.map(({ num, title, whatYouDo, whatGenieDoes, whatYouGet }) => (
              <div key={num} className="relative flex items-start gap-4 mb-4">
                {/* Step number circle */}
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center z-10 mt-0.5">
                  <span className="text-sm font-black text-amber-500">{num}</span>
                </div>

                {/* Content card */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 sm:p-6 hover:border-amber-200 hover:shadow-sm transition-all">
                  <h2 className="text-sm font-bold text-primary mb-4 leading-snug">{title}</h2>
                  <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
                    <div>
                      <p className="text-[11px] font-semibold text-primary/45 uppercase tracking-wide mb-2">
                        {es ? "Lo que haces" : "What you do"}
                      </p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{whatYouDo}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-amber-500/70 uppercase tracking-wide mb-2">
                        {es ? "Lo que hace el Genie" : "What Genie does"}
                      </p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{whatGenieDoes}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-primary/45 uppercase tracking-wide mb-2">
                        {es ? "Lo que obtienes" : "What you get"}
                      </p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{whatYouGet}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example Section ── */}
      <section className="px-4 py-10 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3">
            {es ? "Ejemplo: De la Disputa al Paquete del Caso" : "Example: From Dispute to Case Package"}
          </h2>
          <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            {es
              ? "Por ejemplo, si un contratista recibió un depósito y no terminó el trabajo, Small Claims Genie puede ayudarte a organizar el contrato, registros de pago, fotos, mensajes, cronología, monto adeudado, carta de demanda y presentación para la audiencia alrededor de esa reclamación específica."
              : "For example, if a contractor took a deposit and did not finish the work, Small Claims Genie can help you organize the contract, payment records, photos, messages, timeline, amount owed, demand letter, and hearing presentation around that specific claim."}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {exampleSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#f5fdfb] rounded-lg px-4 py-3 border border-gray-100">
                <ArrowRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[13px] text-muted-foreground leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── At the End, You Have a Case Package ── */}
      <section className="px-4 py-10 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {es ? "Al Final, Tienes un Paquete del Caso" : "At the End, You Have a Case Package"}
            </h2>
            <p className="text-primary-foreground/70 text-base max-w-xl mx-auto leading-relaxed">
              {es
                ? "Small Claims Genie te ayuda a terminar el proceso con materiales organizados que puedes usar para presentar, notificar, preparar y explicar tu caso de forma más clara."
                : "Small Claims Genie helps you leave the process with organized materials you can use to file, serve, prepare, and explain your case more clearly."}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {casePackage.map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-amber-300 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-4 py-10 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-primary mb-2">
            {es
              ? "Prepárate mejor. Organízate claramente. Preséntate con confianza."
              : "Prepare smarter. Organize clearly. Present confidently."}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {es
              ? "Small Claims Genie es gratis para comenzar. Paga solo cuando estés listo para descargar tus formularios listos para el tribunal."
              : "Small Claims Genie is free to start. Pay only when you are ready to download your court-ready forms."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              onClick={() => gtagReportConversion()}
              className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
              aria-label={es ? "Comienza tu caso gratis" : "Start your small claims case for free"}
            >
              <Link href="/cases/new">
                <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {es ? "Comenzar tu Caso Gratis" : "Start Your Case Free"}
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
              className="h-12 px-8 text-base rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5"
              aria-label={es ? "Pregunta al Genie gratis" : "Ask the Genie a question for free"}
            >
              {es ? "Pregunta al Genie Gratis" : "Ask the Genie Free"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works FAQ ── */}
      <section className="px-4 py-12 bg-[#f5fdfb]">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">
              {es ? "Preguntas Frecuentes sobre Cómo Funciona" : "How It Works FAQ"}
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {howItWorksFaqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`hiw-faq-${idx}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-2 data-[state=open]:border-amber-200"
              >
                <AccordionTrigger className="px-4 py-4 text-sm font-semibold text-primary hover:no-underline text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-8">
            <Link href="/" className="text-sm text-primary/60 hover:text-primary underline underline-offset-4 transition-colors">
              {es ? "← Volver al Inicio" : "← Back to Home"}
            </Link>
          </div>
        </div>
      </section>

    </div>

    {/* ── Floating Genie Button — desktop only ── */}
    <div
      className="hidden md:block fixed bottom-6 right-6 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Button
        size="sm"
        onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
        className="h-10 pl-3 pr-4 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-semibold shadow-md"
        aria-label={es ? "Pregunta al Genie gratis" : "Ask the Genie a question for free"}
      >
        <Wand2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{es ? "Pregunta al Genie — " : "Ask the Genie — "}</span>{es ? "Gratis" : "Free"}
      </Button>
    </div>

    </>
  );
}
