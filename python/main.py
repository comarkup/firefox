from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import subprocess
import docker
import base64
from PIL import Image
import io
import json
import logging

app = FastAPI(title="Code Execution & Visualization API")

class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    input_data: Optional[Dict[str, Any]] = None
    timeout: Optional[int] = 30
    memory_limit: Optional[int] = 512
    visualization_type: Optional[str] = None  # "image", "text", or "both"

class CodeExecutionResponse(BaseModel):
    status: str
    output: Optional[str]
    error: Optional[str]
    execution_time: float
    memory_usage: float
    visualization_data: Optional[Dict[str, str]]  # Base64 encoded image and/or formatted text

# Konfiguracja obsługiwanych języków i środowisk
SUPPORTED_LANGUAGES = {
    "python": {
        "image": "python:3.9-slim",
        "file_extension": ".py",
        "command": ["python"],
    },
    "javascript": {
        "image": "node:14-alpine",
        "file_extension": ".js",
        "command": ["node"],
    },
    "java": {
        "image": "openjdk:11-jdk-slim",
        "file_extension": ".java",
        "command": ["java"],
    },
    "sql": {
        "image": "postgres:13-alpine",
        "file_extension": ".sql",
        "command": ["psql"],
    }
}

class CodeExecutor:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.logger = logging.getLogger(__name__)

    async def execute_code(self, request: CodeExecutionRequest) -> CodeExecutionResponse:
        if request.language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")

        try:
            # Przygotowanie kontenera
            container_config = SUPPORTED_LANGUAGES[request.language]
            container = self.docker_client.containers.run(
                container_config["image"],
                detach=True,
                mem_limit=f"{request.memory_limit}m",
                network_disabled=True
            )

            # Wykonanie kodu
            result = self._run_code_in_container(
                container,
                request.code,
                container_config,
                request.timeout
            )

            # Generowanie wizualizacji
            visualization = await self._generate_visualization(
                result,
                request.visualization_type
            )

            return CodeExecutionResponse(
                status="success",
                output=result["output"],
                execution_time=result["execution_time"],
                memory_usage=result["memory_usage"],
                visualization_data=visualization
            )

        except Exception as e:
            self.logger.error(f"Error executing code: {str(e)}")
            return CodeExecutionResponse(
                status="error",
                error=str(e),
                execution_time=0,
                memory_usage=0
            )

    def _run_code_in_container(self, container, code, config, timeout):
        # Implementacja wykonania kodu w kontenerze
        pass

    async def _generate_visualization(self, result, viz_type):
        if not viz_type:
            return None

        visualizations = {}

        if viz_type in ["image", "both"]:
            # Generowanie wizualizacji graficznej
            try:
                # Przykład generowania wykresu
                import matplotlib.pyplot as plt

                # Konwersja wykresu do base64
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                buf.seek(0)
                image_base64 = base64.b64encode(buf.getvalue()).decode()
                visualizations["image"] = image_base64
            except Exception as e:
                self.logger.error(f"Error generating image visualization: {str(e)}")

        if viz_type in ["text", "both"]:
            # Formatowanie tekstu
            try:
                formatted_text = self._format_output(result["output"])
                visualizations["text"] = formatted_text
            except Exception as e:
                self.logger.error(f"Error generating text visualization: {str(e)}")

        return visualizations

    def _format_output(self, output):
        # Implementacja formatowania tekstu
        pass

# Endpoints API
@app.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    executor = CodeExecutor()
    return await executor.execute_code(request)

@app.get("/supported-languages")
async def get_supported_languages():
    return {"languages": list(SUPPORTED_LANGUAGES.keys())}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
