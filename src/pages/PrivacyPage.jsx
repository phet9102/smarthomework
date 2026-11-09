import PageShell from './PageShell.jsx';
import { useI18n } from '../i18n/index.jsx';

const CONTACT = 'smarthomeworkmail@gmail.com';
const UPDATED = '2026-11-09';

/** Plain-language privacy policy. Public page at /privacy (required by Google for the Gmail sender app). */
const CONTENT = {
  th: {
    title: 'นโยบายความเป็นส่วนตัว',
    updated: 'ปรับปรุงล่าสุด',
    intro:
      'Smart Homework ("เรา") เป็นเว็บแอปช่วยนักเรียนจัดลำดับการบ้านและวางแผนอ่านหนังสือ หน้านี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้ทำอะไร และคุณมีสิทธิ์อะไรบ้าง',
    sections: [
      {
        h: 'ข้อมูลที่เราเก็บ',
        items: [
          'ข้อมูลบัญชี: อีเมล ชื่อเล่น (ถ้ากรอก) ภาษาที่เลือก และรหัสผ่านที่ถูกเข้ารหัสแบบทางเดียว (เราไม่เห็นรหัสผ่านจริงของคุณ)',
          'ข้อมูลการชำระเงิน: ยอดเงิน แพ็กเกจ วันเวลา และหมายเหตุที่คุณพิมพ์ตอนแจ้งโอน เราไม่เก็บเลขบัญชีหรือข้อมูลบัตรใดๆ',
          'ข้อมูลซิงก์คลาวด์: รายการการบ้านและการตั้งค่า เฉพาะเมื่อคุณกด "อัปโหลดขึ้นคลาวด์" เอง',
          'คุกกี้: ใช้คุกกี้เดียวสำหรับคงสถานะการเข้าสู่ระบบ ไม่มีคุกกี้โฆษณาหรือติดตามพฤติกรรม',
        ],
      },
      {
        h: 'ข้อมูลที่อยู่ในเครื่องของคุณ',
        items: [
          'รายการการบ้านเก็บในเบราว์เซอร์ของคุณ (LocalStorage) ไม่ถูกส่งมาที่เซิร์ฟเวอร์ ยกเว้นเมื่อใช้ซิงก์คลาวด์',
        ],
      },
      {
        h: 'เราใช้ข้อมูลเพื่อ',
        items: [
          'ให้คุณเข้าสู่ระบบและใช้งานแอป',
          'ส่งอีเมลยืนยันการสมัครเท่านั้น เราไม่ส่งอีเมลโฆษณา',
          'ตรวจสอบการชำระเงินและเปิดสิทธิ์ Pro',
          'ป้องกันการใช้งานผิดวัตถุประสงค์ เช่น จำกัดจำนวนครั้งการล็อกอินผิด',
        ],
      },
      {
        h: 'การส่งอีเมลและผู้ให้บริการ',
        items: [
          `อีเมลยืนยันส่งจากบัญชี ${CONTACT} ผ่าน Gmail API โดยใช้สิทธิ์ "ส่งอีเมล" เท่านั้น เราไม่อ่าน ไม่เก็บ และไม่วิเคราะห์อีเมลในกล่องจดหมายของใคร`,
          'เว็บและฐานข้อมูลให้บริการบน Cloudflare',
          'เราไม่ขาย ไม่ให้เช่า และไม่แบ่งปันข้อมูลส่วนตัวของคุณกับบุคคลอื่นเพื่อการตลาด',
        ],
      },
      {
        h: 'ระยะเวลาเก็บข้อมูล',
        items: [
          'เก็บข้อมูลบัญชีตราบเท่าที่บัญชียังใช้งานอยู่ ลิงก์ยืนยันอีเมลหมดอายุใน 24 ชั่วโมง',
          'ประวัติการชำระเงินอาจเก็บไว้ตามที่จำเป็นสำหรับการตรวจสอบและบัญชี',
        ],
      },
      {
        h: 'สิทธิ์ของคุณ (PDPA)',
        items: [
          'ขอดู แก้ไข หรือขอสำเนาข้อมูลของคุณ',
          'ขอลบบัญชีและข้อมูลทั้งหมด',
          'ถอนความยินยอมได้ทุกเมื่อ',
          `ติดต่อได้ที่ ${CONTACT} เราจะตอบกลับโดยเร็ว`,
        ],
      },
      {
        h: 'ผู้ใช้ที่อายุต่ำกว่า 18 ปี',
        items: ['แอปนี้ออกแบบสำหรับนักเรียน ผู้ใช้ที่ยังไม่บรรลุนิติภาวะควรได้รับความยินยอมจากผู้ปกครองก่อนสมัครและก่อนชำระเงิน'],
      },
      {
        h: 'การเปลี่ยนแปลงนโยบาย',
        items: ['หากมีการเปลี่ยนแปลงที่สำคัญ เราจะแจ้งในหน้านี้และปรับวันที่ "ปรับปรุงล่าสุด"'],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated',
    intro:
      'Smart Homework ("we") is a web app that helps students prioritize homework and plan study time. This page explains what we collect, why, and your rights.',
    sections: [
      {
        h: 'What we collect',
        items: [
          'Account data: email, nickname (optional), language, and a one-way hashed password (we never see your actual password).',
          'Payment records: amount, plan, timestamps and the note you type when reporting a transfer. We do not store bank account or card details.',
          'Cloud sync data: your tasks and settings, only when you choose "Upload to cloud".',
          'Cookies: a single cookie to keep you logged in. No advertising or tracking cookies.',
        ],
      },
      {
        h: 'Data that stays on your device',
        items: ['Your homework list is stored in your browser (LocalStorage) and is not sent to our server unless you use cloud sync.'],
      },
      {
        h: 'How we use data',
        items: [
          'To let you log in and use the app',
          'To send the sign-up confirmation email only. We do not send marketing email.',
          'To verify payments and enable Pro',
          'To prevent abuse, such as limiting failed log-in attempts',
        ],
      },
      {
        h: 'Email and service providers',
        items: [
          `Confirmation emails are sent from ${CONTACT} through the Gmail API using send-only permission. We do not read, store or analyze anyone's mailbox.`,
          'The website and database are hosted on Cloudflare.',
          'We do not sell, rent or share your personal data with others for marketing.',
        ],
      },
      {
        h: 'Retention',
        items: [
          'Account data is kept while your account is active. Email confirmation links expire after 24 hours.',
          'Payment history may be kept as needed for record-keeping.',
        ],
      },
      {
        h: 'Your rights',
        items: [
          'Access, correct or get a copy of your data',
          'Ask us to delete your account and all data',
          'Withdraw consent at any time',
          `Contact: ${CONTACT}`,
        ],
      },
      {
        h: 'Users under 18',
        items: ['This app is designed for students. Minors should have a parent or guardian’s permission before signing up or paying.'],
      },
      {
        h: 'Changes',
        items: ['If this policy changes in a meaningful way, we will update this page and its "Last updated" date.'],
      },
    ],
  },
};

export default function PrivacyPage() {
  const { lang, fmt } = useI18n();
  const c = CONTENT[lang] || CONTENT.th;
  return (
    <PageShell>
      <article className="card space-y-5 p-6">
        <header>
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {c.updated}: {fmt.date(UPDATED)}
          </p>
        </header>
        <p className="text-sm leading-relaxed text-slate-700">{c.intro}</p>
        {c.sections.map((s) => (
          <section key={s.h}>
            <h2 className="mb-2 font-bold">{s.h}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
              {s.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </PageShell>
  );
}
