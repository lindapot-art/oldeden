# Old Eden ML Service

Python-based machine learning microservice for procedural asset generation and optimization.

## Quick Start

```bash
cd python-ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py --dev
```

## Features

- **Text-to-3D Generation**: Generate spaceship/character models from descriptions
- **Model Optimization**: ML-based mesh simplification and LOD generation
- **Quality Assessment**: Automated asset validation and scoring
- **Style Transfer**: Apply faction aesthetics to generic models

## API Documentation

See [API.md](./API.md) for full endpoint documentation.

## Configuration

Copy `.env.example` to `.env` and configure:

```env
AI_SERVICE_PORT=8000
AI_SERVICE_API_KEY=your_secret_key
USE_GPU=true
```

## License

Same as main Old Eden project.
