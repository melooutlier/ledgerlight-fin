const RULES: Array<[RegExp, string]> = [
  [/hamb[uú]rg|burger/, "🍔"],
  [/pizza/, "🍕"],
  [/frango|galinha|churrasc/, "🍗"],
  [/cerveja|bebida|bar\b|copos/, "🍺"],
  [/caf[eé]|ch[aá]\b/, "☕"],
  [/p[aã]o|padaria/, "🥖"],
  [/refei[cç]|almo[cç]|jantar|restaurante|comida|lanche/, "🍽️"],
  [/mercado|supermercado|compras do m[eê]s|rancho|shoprite|mercearia/, "🛒"],
  [/fruta|banana|manga/, "🍌"],
  [/peixe|marisco|camar[aã]o/, "🐟"],
  [/combust|gasolina|gas[oó]leo|diesel/, "⛽"],
  [/chapa|t[aá]xi|uber|yango|txopela|transporte|machimbombo|bolt/, "🚕"],
  [/carro|mec[aâ]nic|oficina/, "🚗"],
  [/avi[aã]o|voo|viagem/, "✈️"],
  [/internet|wifi|dados|megas/, "📶"],
  [/cr[eé]dito|recarga|telefone|celular|telem[oó]vel/, "📱"],
  [/energia|credelec|luz|eletricidade/, "💡"],
  [/[aá]gua|fipag/, "🚰"],
  [/renda|aluguer|casa|condom[ií]nio/, "🏠"],
  [/farm[aá]cia|rem[eé]dio|medicamento/, "💊"],
  [/hospital|m[eé]dic|cl[ií]nica|consulta/, "🏥"],
  [/roupa|camisa|cal[cç]a|vestido|sapato|t[eé]nis/, "👕"],
  [/cabel|sal[aã]o|barbe/, "💇"],
  [/escola|propina|livro|curso|estudo|faculdade/, "📚"],
  [/igreja|d[ií]zimo|oferta/, "⛪"],
  [/presente|anivers/, "🎁"],
  [/cinema|filme|netflix|dstv|tv\b|zap/, "🎬"],
  [/jogo|futebol|gin[aá]sio|desporto/, "⚽"],
  [/computador|port[aá]til|laptop/, "💻"],
  [/sal[aá]rio|ordenado/, "💰"],
  [/venda|vendi|neg[oó]cio|stock|loja/, "🏪"],
  [/freelanc|projeto|servi[cç]o/, "🧑‍💻"],
  [/empr[eé]stimo|d[ií]vida/, "🤝"],
  [/poupan|cofre|guardar/, "🐷"],
  [/investi/, "📈"],
  [/beb[eé]|fralda/, "🍼"],
  [/empregada|limpeza/, "🧹"],
  [/g[aá]s\b|botija/, "🔥"],
];

const CATEGORY: Record<string, string> = {
  "Alimentação": "🍽️",
  Transporte: "🚕",
  Casa: "🏠",
  "Internet/Telefone": "📶",
  Roupas: "👕",
  Estudos: "📚",
  Trabalho: "💼",
  "Negócio": "🏪",
  Igreja: "⛪",
  Lazer: "🎉",
  Compras: "🛍️",
  Investimentos: "📈",
  "Salário": "💰",
  Freelance: "🧑‍💻",
  Venda: "🏷️",
  Presente: "🎁",
  Reembolso: "↩️",
  Investimento: "📈",
};

/** Picks an emoji from the description first, then the category, then the type. */
export function emojiFor(description: string, categoryName?: string | null, type?: string): string {
  const d = description.toLowerCase();
  for (const [re, e] of RULES) if (re.test(d)) return e;
  if (categoryName && CATEGORY[categoryName]) return CATEGORY[categoryName];
  if (type === "income") return "💵";
  if (type === "expense") return "💸";
  return "🔁";
}
