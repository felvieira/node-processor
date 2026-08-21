use serde::{Deserialize, Serialize};

const SYSTEM_PROMPT: &str = "Você é um assistente que analisa processos de desenvolvimento rodando numa máquina Windows. Para cada processo, decida se pode ser encerrado. Responda APENAS com JSON: {\"itens\":[{\"pid\":number,\"verdict\":\"safe\"|\"careful\"|\"keep\",\"reason\":\"até 220 caracteres em português\"}]}. Trate instâncias duplicadas do mesmo comando na mesma pasta como safe, mantendo a mais recente. Bancos de dados e containers com estado são keep. Agentes de IA em execução são careful.";

#[derive(Debug, Deserialize, Serialize)]
pub struct ProcessSnapshot {
    pub pid: u32,
    pub tipo: String,
    pub pasta: String,
    pub comando: String,
    pub portas: Vec<u16>,
    pub cpu: f32,
    pub memoria_mb: u64,
    pub ativo: String,
    pub rastreado: bool,
}

#[derive(Debug, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Verdict {
    Safe,
    Careful,
    Keep,
}

#[derive(Debug, Serialize)]
pub struct AiVerdictItem {
    pub pid: u32,
    pub verdict: Verdict,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
struct RawVerdictItem {
    pid: u32,
    verdict: String,
    reason: String,
}

#[derive(Debug, Deserialize)]
struct RawVerdicts {
    #[serde(alias = "items")]
    itens: Vec<RawVerdictItem>,
}

#[derive(Debug, Serialize)]
struct ChatMessage<'a> {
    role: &'a str,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    temperature: f32,
    messages: Vec<ChatMessage<'a>>,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ChatResponseMessage {
    content: String,
}

fn provider_url(provider: &str) -> Result<&'static str, String> {
    match provider {
        "openrouter" => Ok("https://openrouter.ai/api/v1/chat/completions"),
        "openai" => Ok("https://api.openai.com/v1/chat/completions"),
        other => Err(format!("provider desconhecido: {other}")),
    }
}

pub async fn run_analysis(
    provider: String,
    api_key: String,
    model: String,
    snapshot: Vec<ProcessSnapshot>,
) -> Result<Vec<AiVerdictItem>, String> {
    if api_key.trim().is_empty() {
        return Err("chave de API vazia".to_string());
    }

    let url = provider_url(&provider)?;
    let payload = ChatRequest {
        model: &model,
        temperature: 0.2,
        messages: vec![
            ChatMessage {
                role: "system",
                content: SYSTEM_PROMPT.to_string(),
            },
            ChatMessage {
                role: "user",
                content: serde_json::to_string(&serde_json::json!({ "processos": snapshot }))
                    .map_err(|e| e.to_string())?,
            },
        ],
    };

    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .bearer_auth(&api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("falha na requisição: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let snippet: String = body.chars().take(200).collect();
        return Err(format!("HTTP {status} — {snippet}"));
    }

    let parsed: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("resposta inesperada do provider: {e}"))?;

    let content = parsed
        .choices
        .first()
        .map(|c| c.message.content.trim())
        .ok_or("resposta sem choices")?;

    let cleaned = content
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let raw: RawVerdicts =
        serde_json::from_str(cleaned).map_err(|e| format!("JSON inválido do modelo: {e}"))?;

    let items: Vec<AiVerdictItem> = raw
        .itens
        .into_iter()
        .filter_map(|i| {
            let verdict = match i.verdict.as_str() {
                "safe" => Verdict::Safe,
                "keep" => Verdict::Keep,
                _ => Verdict::Careful,
            };
            Some(AiVerdictItem {
                pid: i.pid,
                verdict,
                reason: i.reason,
            })
        })
        .collect();

    if items.is_empty() {
        return Err("resposta sem itens reconhecíveis".to_string());
    }

    Ok(items)
}
