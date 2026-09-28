from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração lida do ambiente (ou de backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8-sig", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Projeto usado quando o usuário não tem `app_metadata.projeto_id`.
    default_projeto_id: str = ""
    supabase_storage_bucket_ingestao: str = "ingestao-raw"

    openrouter_api_key: str = ""
    openrouter_modelo_llm: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    openrouter_modelo_chat: str = "nvidia/nemotron-3-super-120b-a12b:free"

    gemini_api_key: str = Field(
        default="", validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY")
    )
    gemini_modelo_embedding: str = "gemini-embedding-001"

    # URL pública do frontend: vai no cabeçalho HTTP-Referer da OpenRouter.
    app_url: str = "http://localhost:5173"
    # Origens liberadas no CORS, separadas por vírgula.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Liga o atributo Secure nos cookies de sessão (use true atrás de HTTPS).
    cookie_secure: bool = False

    @property
    def lista_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def obter_settings() -> Settings:
    return Settings()
