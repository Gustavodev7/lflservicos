/**
 * Grupo LFL Serviços — recebe os leads da landing page e grava no Google Sheets.
 *
 * Instalação (uma vez):
 *  1. Na planilha: Extensões > Apps Script. Cole este arquivo em Code.gs.
 *  2. Rode a função `setup` (Executar) e autorize o acesso à planilha e ao e-mail.
 *     Ela cria a aba "Leads" e o gatilho diário de retenção (exclusão após 24 meses).
 *  3. Implantar > Nova implantação > Tipo "App da Web":
 *       Executar como: Eu  |  Quem pode acessar: Qualquer pessoa
 *  4. Copie a URL terminada em /exec para LEADS_ENDPOINT em js/main.js.
 * Ao alterar este código, publique em Implantar > Gerenciar implantações > Editar
 * > Nova versão, para manter a mesma URL.
 *
 * Este arquivo NÃO vai para o servidor do site; ele roda só no Google.
 */

var SHEET_NAME = "Leads";
var NOTIFY_EMAIL = "contato@grupolflservicos.com.br"; // "" desliga o aviso por e-mail
var MAX_PER_MINUTE = 20; // teto global contra enxurrada de envios
var MAX_PER_IDENTITY_HOUR = 3; // mesmo e-mail/WhatsApp por hora
var MAX_ROWS_PER_DAY = 200; // teto diário de linhas gravadas
var MIN_MAIL_QUOTA = 5; // reserva da cota diária do MailApp
var MIN_FILL_MS = 3000; // envios mais rápidos que isso são tratados como bot
var RETENTION_DAYS = 730; // 24 meses, conforme a Política de Privacidade

var HEADERS = [
  "Data/hora",
  "Nome",
  "Empresa",
  "WhatsApp",
  "E-mail",
  "Cidade",
  "Serviço",
  "Mensagem",
  "Origem",
  "Aviso por e-mail",
];

// [campo, tamanho máximo, obrigatório]
var FIELDS = [
  ["nome", 120, true],
  ["empresa", 120, true],
  ["whatsapp", 30, true],
  ["email", 160, true],
  ["cidade", 80, false],
  ["servico", 60, false],
  ["mensagem", 2000, false],
];

var SERVICOS = [
  "",
  "Portaria",
  "Controle de acesso",
  "Zeladoria",
  "Manutenção predial",
  "Serviços de apoio",
];

var EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  // Reescreve o cabeçalho sempre: atualiza abas criadas por versões anteriores.
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  // Colunas de texto puro: nada vira número, data ou fórmula.
  sheet.getRange(2, 2, sheet.getMaxRows() - 1, HEADERS.length - 1).setNumberFormat("@");

  var hasTrigger = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === "purgeOldLeads";
  });
  if (!hasTrigger) {
    ScriptApp.newTrigger("purgeOldLeads").timeBased().everyDays(1).atHour(3).create();
  }
}

function doPost(e) {
  var params = (e && e.parameter) || {};

  // Bots: respondem "ok" para não aprenderem a contornar, mas nada é gravado.
  if (params.website || !(Number(params.t) >= MIN_FILL_MS)) {
    return json_({ ok: true });
  }

  var lead = validate_(params);
  if (!lead) return json_({ ok: false });

  var lock = LockService.getScriptLock();
  var row;
  try {
    lock.waitLock(10000);
    if (!underLimits_(lead)) return json_({ ok: false });

    var sheet = getSheet_();
    row = sheet.getLastRow() + 1;
    var range = sheet.getRange(row, 1, 1, HEADERS.length);
    range.offset(0, 1, 1, HEADERS.length - 1).setNumberFormat("@");
    range.setValues([
      [
        new Date(),
        safeCell_(lead.nome),
        safeCell_(lead.empresa),
        safeCell_(lead.whatsapp),
        safeCell_(lead.email),
        safeCell_(lead.cidade),
        safeCell_(lead.servico),
        safeCell_(lead.mensagem),
        "Landing page",
        "pendente",
      ],
    ]);
  } catch (err) {
    console.error("Falha ao gravar lead: " + err.name);
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }

  var status = notify_(lead);
  try {
    getSheet_().getRange(row, HEADERS.length).setValue(status);
  } catch (err) {
    console.error("Falha ao registrar status do aviso: " + err.name);
  }
  return json_({ ok: true });
}

function validate_(params) {
  var lead = {};
  for (var i = 0; i < FIELDS.length; i++) {
    var name = FIELDS[i][0];
    var max = FIELDS[i][1];
    var required = FIELDS[i][2];
    var value = String(params[name] || "");
    // Só a mensagem aceita quebra de linha; demais campos são de uma linha.
    value =
      name === "mensagem"
        ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
        : value.replace(/[\u0000-\u001F\u007F]/g, " ");
    value = value.trim();
    if (required && !value) return null;
    if (value.length > max) return null;
    lead[name] = value;
  }

  if (!EMAIL_RE.test(lead.email)) return null;
  var digits = lead.whatsapp.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  if (SERVICOS.indexOf(lead.servico) === -1) return null;
  return lead;
}

// Impede que um texto como "=IMPORTXML(...)" vire fórmula na planilha ou no
// Excel após exportar CSV. O apóstrofo fica guardado como texto (coluna "@").
function safeCell_(value) {
  return /^[=+\-@|%]/.test(value) ? "'" + value : value;
}

// Chamado dentro do lock: contadores consistentes entre execuções paralelas.
function underLimits_(lead) {
  var cache = CacheService.getScriptCache();
  var now = Date.now();
  var minuteKey = "rate_" + Math.floor(now / 60000);
  var identityKey = "id_" + hash_(lead.email.toLowerCase() + "|" + lead.whatsapp.replace(/\D/g, ""));
  var props = PropertiesService.getScriptProperties();
  var dayKey = "rows_" + Utilities.formatDate(new Date(now), "America/Sao_Paulo", "yyyyMMdd");

  var perMinute = Number(cache.get(minuteKey) || 0);
  var perIdentity = Number(cache.get(identityKey) || 0);
  var perDay = Number(props.getProperty(dayKey) || 0);
  if (perMinute >= MAX_PER_MINUTE) return false;
  if (perIdentity >= MAX_PER_IDENTITY_HOUR) return false;
  if (perDay >= MAX_ROWS_PER_DAY) return false;

  cache.put(minuteKey, String(perMinute + 1), 120);
  cache.put(identityKey, String(perIdentity + 1), 3600);
  props.setProperty(dayKey, String(perDay + 1));
  return true;
}

function notify_(lead) {
  if (!NOTIFY_EMAIL) return "desligado";
  if (MailApp.getRemainingDailyQuota() <= MIN_MAIL_QUOTA) return "cota esgotada";
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: ("Novo contato pelo site: " + lead.empresa).slice(0, 100),
      body:
        "Nome: " + lead.nome +
        "\nEmpresa: " + lead.empresa +
        "\nWhatsApp: " + lead.whatsapp +
        "\nE-mail: " + lead.email +
        "\nCidade: " + (lead.cidade || "-") +
        "\nServiço: " + (lead.servico || "Ainda não sabe") +
        "\n\nMensagem:\n" + (lead.mensagem || "-") +
        "\n\nO lead também foi gravado na planilha.",
      replyTo: lead.email,
    });
    return "enviado";
  } catch (err) {
    // O lead já está na planilha; falha no aviso não deve virar erro para o visitante.
    console.error("Falha ao enviar aviso por e-mail: " + err.name);
    return "falhou";
  }
}

// Gatilho diário: exclui leads com mais de RETENTION_DAYS e limpa contadores antigos.
function purgeOldLeads() {
  var sheet = getSheet_();
  var cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  var last = sheet.getLastRow();
  if (last >= 2) {
    var dates = sheet.getRange(2, 1, last - 1, 1).getValues();
    // Linhas em ordem de chegada: as antigas ficam no topo.
    var expired = 0;
    while (expired < dates.length && dates[expired][0] instanceof Date && dates[expired][0].getTime() < cutoff) {
      expired++;
    }
    if (expired > 0) sheet.deleteRows(2, expired);
  }

  var props = PropertiesService.getScriptProperties();
  var today = "rows_" + Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyyMMdd");
  props.getKeys().forEach(function (key) {
    if (key.indexOf("rows_") === 0 && key !== today) props.deleteProperty(key);
  });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  return sheet;
}

function hash_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 32);
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
