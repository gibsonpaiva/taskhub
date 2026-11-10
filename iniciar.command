#!/bin/bash
# ==============================================================================
# Script de Inicialização Rápida para macOS — TaskHub Backup TI
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================================"
echo "  Iniciando TaskHub — Gestão Operacional & Continuidade de Backup TI   "
echo "========================================================================"
echo ""
echo "Diretório do Projeto: $DIR"
echo "Iniciando servidor local com persistência SQLite..."
echo ""

# Verifica Python 3
if command -v python3 &>/dev/null; then
    python3 server.py
elif command -v python &>/dev/null; then
    python server.py
else
    echo "[ERRO] Python 3 não foi encontrado no sistema."
    echo "Por favor instale o Python 3 para executar a aplicação."
    read -p "Pressione Enter para fechar..."
fi
