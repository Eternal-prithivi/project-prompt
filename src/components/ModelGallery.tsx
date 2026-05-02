import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface Model {
  name: string;
  size: string;
  sizeMB: number;
  description: string;
  ramRequired: number;
  downloaded?: boolean;
  downloading?: boolean;
  downloadProgress?: number;
}

interface ModelGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedModel?: string;
  onModelSelect?: (modelName: string) => void;
}

const MODELS: Model[] = [
  {
    name: 'tinyllama:latest',
    size: '1.1GB',
    sizeMB: 1100,
    description: 'Ultra lightweight, perfect for learning',
    ramRequired: 2,
  },
  {
    name: 'llama2:7b',
    size: '3.8GB',
    sizeMB: 3800,
    description: 'Balanced quality and speed',
    ramRequired: 4,
  },
  {
    name: 'llama3.1:8b',
    size: '4.7GB',
    sizeMB: 4700,
    description: "Meta's Llama 3.1 — strong reasoning & instruction following",
    ramRequired: 8,
  },
  {
    name: 'mistral:7b',
    size: '4.1GB',
    sizeMB: 4100,
    description: 'Great reasoning and instruction following',
    ramRequired: 8,
  },
  {
    name: 'neural-chat:7b',
    size: '5GB',
    sizeMB: 5000,
    description: 'Optimized for conversational AI',
    ramRequired: 8,
  },
  {
    name: 'deepseek-r1:7b',
    size: '6GB',
    sizeMB: 6000,
    description: 'Excellent for complex reasoning',
    ramRequired: 16,
  },
  {
    name: 'qwen2.5:14b',
    size: '9.2GB (varies by quantization)',
    sizeMB: 9200,
    description: 'Alibaba Qwen 2.5 — excellent reasoning. Auto-detects any quantization variant (q4_K_M, q5_K_M, etc.)',
    ramRequired: 16,
  },
];

export const ModelGallery: React.FC<ModelGalleryProps> = ({
  isOpen,
  onClose,
  suggestedModel,
  onModelSelect,
}) => {
  const [models, setModels] = useState<Model[]>(MODELS);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (isOpen) {
      fetchDownloadedModels();
    }
  }, [isOpen]);

  const fetchDownloadedModels = async () => {
    try {
      // Check which models are already downloaded
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();

      const downloadedFullNames: string[] = data.models?.map((m: any) => m.name) || [];

      setModels((prevModels) => {
        // Create a map of base model names to their full installed names
        const downloadedByBase = new Map<string, string>();
        downloadedFullNames.forEach((fullName) => {
          const baseName = fullName.split(':')[0].toLowerCase();
          downloadedByBase.set(baseName, fullName);
        });

        // First, mark which predefined models are downloaded and update their name if a variant exists
        const updatedModels = prevModels.map((model) => {
          const modelBase = model.name.split(':')[0].toLowerCase();
          const isDownloaded = downloadedFullNames.includes(model.name) ||
                               downloadedByBase.has(modelBase);
          const actualInstalledName = downloadedByBase.get(modelBase);

          return {
            ...model,
            // Use actual installed name if available (e.g., use qwen2.5:14b-instruct-q4_K_M instead of qwen2.5:14b)
            name: actualInstalledName || model.name,
            downloaded: isDownloaded,
          };
        });

        // Then, dynamically add any installed models not in the predefined list
        const predefinedBases = new Set(
          prevModels.map((m) => m.name.split(':')[0].toLowerCase())
        );

        const dynamicModels = downloadedFullNames
          .filter((fullName: string) => {
            const baseName = fullName.split(':')[0].toLowerCase();
            return !predefinedBases.has(baseName);
          })
          .map((fullName: string) => ({
            name: fullName,
            size: '—',
            sizeMB: 0,
            description: 'Custom installed model',
            ramRequired: 16,
            downloaded: true,
          }));

        return [...updatedModels, ...dynamicModels];
      });
    } catch (error) {
      console.error('Failed to fetch downloaded models:', error);
    }
  };

  const downloadModel = async (modelName: string) => {
    setModels((prev) =>
      prev.map((m) =>
        m.name === modelName ? { ...m, downloading: true, downloadProgress: 0 } : m
      )
    );

    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.length;
        const progress = Math.min((totalBytes / (50 * 1024 * 1024)) * 100, 100);

        setModels((prev) =>
          prev.map((m) =>
            m.name === modelName
              ? { ...m, downloadProgress: Math.round(progress) }
              : m
          )
        );
      }

      // Mark as downloaded
      setModels((prev) =>
        prev.map((m) =>
          m.name === modelName
            ? { ...m, downloaded: true, downloading: false, downloadProgress: 100 }
            : m
        )
      );

      setSelectedModel(modelName);
    } catch (error) {
      console.error(`Failed to download ${modelName}:`, error);
      setModels((prev) =>
        prev.map((m) =>
          m.name === modelName ? { ...m, downloading: false, downloadProgress: 0 } : m
        )
      );
    }
  };

  const deleteModel = async (modelName: string) => {
    try {
      const response = await fetch('http://localhost:11434/api/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (response.ok) {
        setModels((prev) =>
          prev.map((m) => (m.name === modelName ? { ...m, downloaded: false } : m))
        );
        if (selectedModel === modelName) {
          setSelectedModel(null);
        }
      }
    } catch (error) {
      console.error(`Failed to delete ${modelName}:`, error);
    }
  };

  if (!isOpen) return null;

  const downloadedModels = models.filter((m) => m.downloaded);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b sticky top-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Model Gallery</h2>
              <p className="text-gray-600 mt-1">Download & select LLM models</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close model gallery"
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Currently Selected */}
          {selectedModel && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 font-semibold">
                ✓ Using model: <span className="font-mono">{selectedModel}</span>
              </p>
            </div>
          )}

          {/* Available Models */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Available Models</h3>
            <div className="space-y-3">
              {models.map((model) => (
                <div
                  key={model.name}
                  className={`p-4 border rounded-lg transition-all ${
                    selectedModel === model.name
                      ? 'bg-green-50 border-green-300'
                      : model.downloaded
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{model.name}</p>
                        {model.downloaded && <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">Downloaded</span>}
                        {model.name === suggestedModel && (
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{model.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-600">
                        <span>📊 Size: {model.size}</span>
                        <span>💾 RAM needed: {model.ramRequired}GB+</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      {model.downloading ? (
                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-2">
                            Downloading... {model.downloadProgress}%
                          </p>
                          <div className="w-32 h-2 bg-gray-200 rounded overflow-hidden">
                            <div
                              className="h-full bg-green-600 transition-all"
                              style={{ width: `${model.downloadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : model.downloaded ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedModel(model.name);
                              onModelSelect?.(model.name);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => deleteModel(model.name)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => downloadModel(model.name)}
                            disabled={!isOnline}
                            className={`px-3 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                              isOnline
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            title={!isOnline ? "Internet connection required to download models" : ""}
                          >
                            Download
                          </button>
                          {!isOnline && <span className="text-[10px] text-red-500 font-medium">Requires Internet</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Downloaded Models Summary */}
          {downloadedModels.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">✅ Downloaded Models: {downloadedModels.length}</p>
              <div className="flex flex-wrap gap-2">
                {downloadedModels.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => {
                      setSelectedModel(model.name);
                      onModelSelect?.(model.name);
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      selectedModel === model.name
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-green-50'
                    }`}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
