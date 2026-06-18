import { AppFrame } from "@/components/boat/AppFrame";

const email = "chung356833@gmail.com";
const labels = {
  title: "\uBB38\uC758\uD558\uAE30",
  operator: "\uC6B4\uC601: \uC554\uD589\u6F01\uC0AC",
  emailLabel: "\uBB38\uC758 \uC774\uBA54\uC77C",
  response: "\uC751\uB2F5 \uC2DC\uAC04 \uC548\uB0B4: \uD3C9\uC77C \uAE30\uC900 1~3\uC77C \uB0B4 \uB2F5\uBCC0\uB4DC\uB9BD\uB2C8\uB2E4.",
  body: "\uC11C\uBE44\uC2A4 \uC774\uC6A9 \uC911 \uC624\uB958, \uBB38\uC81C \uB370\uC774\uD130 \uC81C\uBCF4, \uC81C\uD734 \uBB38\uC758\uAC00 \uC788\uC73C\uBA74 \uC704 \uC774\uBA54\uC77C\uB85C \uC5F0\uB77D\uD574 \uC8FC\uC138\uC694."
};

export default function ContactPage() {
  return (
    <AppFrame>
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-sky-700">Blue Marina</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">{labels.title}</h1>
        <div className="mt-5 space-y-4 text-sm font-semibold leading-7 text-slate-600">
          <p>{labels.operator}</p>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-500">{labels.emailLabel}</p>
            <a className="mt-1 block break-all text-base font-black text-sky-700" href={`mailto:${email}`}>
              {email}
            </a>
          </div>
          <p>{labels.response}</p>
          <p>{labels.body}</p>
        </div>
      </section>
    </AppFrame>
  );
}
