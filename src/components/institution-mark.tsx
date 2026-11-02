/** Mozambican banks and mobile wallets with official colours and SVG logos from /public/banks. */
export const MOZAMBIQUE_INSTITUTIONS = [
  { id: "mpesa", name: "M-Pesa", provider: "Vodacom", color: "#e31b36", ink: "#ffffff", mark: "M", kind: "mobile" },
  { id: "emola", name: "e-Mola", provider: "Movitel", color: "#f5a623", ink: "#35220a", mark: "e", kind: "mobile" },
  { id: "mkesh", name: "mKesh", provider: "Tmcel", color: "#f5c928", ink: "#183d79", mark: "m", kind: "mobile" },
  { id: "bim", name: "Millennium BIM", provider: "Millennium bim", color: "#bd1744", ink: "#ffffff", mark: "bim", kind: "bank" },
  { id: "bci", name: "BCI", provider: "Banco Comercial e de Investimentos", color: "#d97927", ink: "#ffffff", mark: "BCI", kind: "bank" },
  { id: "standard", name: "Standard Bank", provider: "Standard Bank Moçambique", color: "#0875bd", ink: "#ffffff", mark: "SB", kind: "bank" },
  { id: "nedbank", name: "Nedbank Moçambique", provider: "Nedbank", color: "#16844a", ink: "#ffffff", mark: "N", kind: "bank" },
  { id: "absa", name: "Absa Bank", provider: "Absa", color: "#d7193f", ink: "#ffffff", mark: "ab", kind: "bank" },
  { id: "moza", name: "Moza Banco", provider: "Moza Banco", color: "#1768a9", ink: "#ffffff", mark: "MOZA", kind: "bank" },
  { id: "fnb", name: "FNB Moçambique", provider: "FNB", color: "#00a5a8", ink: "#ffffff", mark: "FNB", kind: "bank" },
  { id: "access", name: "Access Bank", provider: "Access Bank", color: "#07569c", ink: "#ffffff", mark: "A", kind: "bank" },
  { id: "cash", name: "Dinheiro em Carteira", provider: "Dinheiro físico", color: "#166534", ink: "#ffffff", mark: "MT", kind: "cash" },
  { id: "other", name: "Outra instituição", provider: "Personalizada", color: "#68756a", ink: "#ffffff", mark: "+", kind: "other" },
] as const;

const LOGO_FILES: Record<string, string> = {
  mpesa: "mpesa",
  emola: "emola",
  mkesh: "mkesh",
  bim: "millennium-bim",
  bci: "bci",
  standard: "standard-bank",
  nedbank: "nedbank",
  absa: "absa",
  moza: "moza-banco",
  fnb: "fnb",
  access: "access-bank",
  cash: "dinheiro-carteira",
};

export function findInstitution(id: string | null | undefined) {
  return MOZAMBIQUE_INSTITUTIONS.find((bank) => bank.id === id) ?? MOZAMBIQUE_INSTITUTIONS[12];
}

export function InstitutionMark({ institution, size = "md" }: { institution: string; size?: "sm" | "md" | "lg" }) {
  const item = findInstitution(institution);
  const dimensions = size === "lg" ? "size-14 rounded-2xl" : size === "sm" ? "size-9 rounded-xl" : "size-11 rounded-2xl";
  const logo = LOGO_FILES[institution];
  return (
    <span
      title={item.name}
      aria-label={item.name}
      className={"inline-flex shrink-0 items-center justify-center overflow-hidden " + dimensions}
      style={{ backgroundColor: item.color }}
    >
      {logo ? <img src={"/banks/" + logo + ".svg"} alt={item.name} className="size-full object-cover" /> : <span className="font-extrabold" style={{ color: item.ink }}>{item.mark}</span>}
    </span>
  );
}
