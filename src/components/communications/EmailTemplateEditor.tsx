import { useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  Image as ImageIcon,
  Type,
  Layout,
  Eye,
  Code,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Upload,
  Loader2,
  Send
} from 'lucide-react';

interface EmailBlock {
  id: string;
  type: 'header' | 'hero' | 'text' | 'features' | 'cta' | 'image' | 'footer';
  content: {
    [key: string]: any;
  };
}

interface EmailTemplateEditorProps {
  initialSubject?: string;
  initialBlocks?: EmailBlock[];
  onSave: (subject: string, blocks: EmailBlock[], html: string) => void;
}

export default function EmailTemplateEditor({
  initialSubject = '',
  initialBlocks = [],
  onSave
}: EmailTemplateEditorProps) {
  const { language } = useLanguage();
  const [subject, setSubject] = useState(initialSubject);
  const [previewText, setPreviewText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const textAreaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const [blocks, setBlocks] = useState<EmailBlock[]>(
    initialBlocks.length > 0 ? initialBlocks : [
      {
        id: '1',
        type: 'header',
        content: { logoUrl: '/logo_transp.png', backgroundColor: '#ffffff' }
      },
      {
        id: '2',
        type: 'hero',
        content: {
          title: 'Level Up Your Performance',
          subtitle: 'Entrenamiento, ciencia y comunidad para ir más alto.',
          backgroundColor: '#000000',
          buttonText: 'Join Asciende',
          buttonUrl: 'https://asciende.pro',
          buttonColor: '#fdda36'
        }
      },
      {
        id: '3',
        type: 'text',
        content: {
          title: 'Hola, atleta 👋',
          body: 'Te damos la bienvenida a Asciende, la plataforma creada para que atletas del Sur Global entrenen mejor, aprendan más y encuentren oportunidades reales de crecimiento.'
        }
      },
      {
        id: '4',
        type: 'features',
        content: {
          features: [
            { icon: '💪', title: 'Training', description: 'Planes basados en ciencia' },
            { icon: '🍎', title: 'Nutrition', description: 'Comer para rendir mejor' },
            { icon: '🤝', title: 'Community', description: 'Crecer juntos' }
          ]
        }
      },
      {
        id: '5',
        type: 'cta',
        content: {
          text: 'Entrar al Hub →',
          url: 'https://hub.asciende.pro',
          backgroundColor: '#000000',
          textColor: '#ffffff'
        }
      },
      {
        id: '6',
        type: 'footer',
        content: {
          companyName: 'Asciende.pro',
          location: 'Alemania',
          socials: {
            instagram: 'https://instagram.com/asciende.pro',
            linkedin: 'https://linkedin.com/company/asciende',
            twitter: 'https://twitter.com/asciende'
          }
        }
      }
    ]
  );
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [editingBlock, setEditingBlock] = useState<string | null>(null);

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type)
    };
    setBlocks([...blocks, newBlock]);
  };

  const getDefaultContent = (type: EmailBlock['type']) => {
    switch (type) {
      case 'header':
        return { logoUrl: '/logo_transp.png', backgroundColor: '#ffffff' };
      case 'hero':
        return {
          title: 'Your Title Here',
          subtitle: 'Subtitle text',
          backgroundColor: '#000000',
          buttonText: 'Call to Action',
          buttonUrl: '#',
          buttonColor: '#fdda36'
        };
      case 'text':
        return { title: 'Section Title', body: 'Your text here...' };
      case 'features':
        return {
          features: [
            { icon: '💪', title: 'Feature 1', description: 'Description' },
            { icon: '🎯', title: 'Feature 2', description: 'Description' },
            { icon: '🚀', title: 'Feature 3', description: 'Description' }
          ]
        };
      case 'cta':
        return {
          text: 'Click Here',
          url: '#',
          backgroundColor: '#000000',
          textColor: '#ffffff'
        };
      case 'image':
        return { url: '', alt: 'Image', width: '100%' };
      case 'footer':
        return {
          companyName: 'Asciende.pro',
          location: 'Alemania',
          socials: {}
        };
      default:
        return {};
    }
  };

  const updateBlock = (id: string, content: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('email-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('email-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    setUploadingImage(true);
    const url = await uploadImageToStorage(file);
    if (url) {
      const block = blocks.find(b => b.id === blockId);
      if (block) {
        updateBlock(blockId, { ...block.content, url });
      }
    }
    setUploadingImage(false);
  };

  const handleLogoUpload = async (blockId: string, file: File) => {
    setUploadingLogo(true);
    const url = await uploadImageToStorage(file);
    if (url) {
      const block = blocks.find(b => b.id === blockId);
      if (block) {
        updateBlock(blockId, { ...block.content, logoUrl: url });
      }
    }
    setUploadingLogo(false);
  };

  const applyTextFormat = (blockId: string, format: 'bold' | 'italic' | 'underline' | 'ul' | 'ol' | 'link') => {
    const textArea = textAreaRefs.current[blockId];
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const selectedText = textArea.value.substring(start, end);

    if (!selectedText) return;

    let formattedText = '';
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    switch (format) {
      case 'bold':
        formattedText = `<strong>${selectedText}</strong>`;
        break;
      case 'italic':
        formattedText = `<em>${selectedText}</em>`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      case 'ul':
        formattedText = `<ul><li>${selectedText}</li></ul>`;
        break;
      case 'ol':
        formattedText = `<ol><li>${selectedText}</li></ol>`;
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          formattedText = `<a href="${url}" style="color:#007bff;text-decoration:underline;">${selectedText}</a>`;
        } else {
          return;
        }
        break;
    }

    const newBody = textArea.value.substring(0, start) + formattedText + textArea.value.substring(end);
    updateBlock(blockId, { ...block.content, body: newBody });

    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(start, start + formattedText.length);
    }, 0);
  };

  const generateHTML = () => {
    let html = `
<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background:#f5f5f5; font-family:Arial, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5; padding:20px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden;">
`;

    blocks.forEach(block => {
      html += generateBlockHTML(block);
    });

    html += `
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

    return html;
  };

  const generateBlockHTML = (block: EmailBlock) => {
    switch (block.type) {
      case 'header':
        return `
        <tr>
          <td style="padding:24px 0; text-align:center; background:${block.content.backgroundColor};">
            <img src="${block.content.logoUrl}" alt="Asciende" width="120" style="display:block; margin:auto;"/>
          </td>
        </tr>`;

      case 'hero':
        return `
        <tr>
          <td style="background:${block.content.backgroundColor}; color:#ffffff; padding:50px 40px; text-align:center;">
            <h1 style="margin:0; font-size:28px; font-weight:bold;">${block.content.title}</h1>
            <p style="margin:10px 0 20px; font-size:16px; opacity:0.85;">
              ${block.content.subtitle}
            </p>
            <a href="${block.content.buttonUrl}"
               style="background:${block.content.buttonColor}; color:#000; padding:12px 24px; border-radius:8px;
                      font-weight:bold; text-decoration:none; display:inline-block;">
              ${block.content.buttonText}
            </a>
          </td>
        </tr>`;

      case 'text':
        return `
        <tr>
          <td style="padding:40px;">
            <h2 style="font-size:20px; margin-top:0; color:#333;">${block.content.title}</h2>
            <p style="font-size:15px; line-height:1.6; color:#555;">
              ${block.content.body}
            </p>
          </td>
        </tr>`;

      case 'features':
        const featuresHTML = block.content.features.map((f: any) => `
                <td width="33%" style="text-align:center; padding:10px;">
                  <div style="font-size:40px; margin-bottom:10px;">${f.icon}</div>
                  <h3 style="font-size:16px; margin:5px 0;">${f.title}</h3>
                  <p style="font-size:13px; color:#555;">${f.description}</p>
                </td>
        `).join('');
        return `
        <tr>
          <td style="padding:0 40px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${featuresHTML}
              </tr>
            </table>
          </td>
        </tr>`;

      case 'cta':
        return `
        <tr>
          <td style="text-align:center; padding:30px 40px;">
            <a href="${block.content.url}"
               style="background:${block.content.backgroundColor}; color:${block.content.textColor}; padding:14px 28px; border-radius:8px;
                      font-weight:bold; text-decoration:none; display:inline-block;">
              ${block.content.text}
            </a>
          </td>
        </tr>`;

      case 'image':
        return `
        <tr>
          <td style="padding:20px 40px;">
            <img src="${block.content.url}" alt="${block.content.alt}" style="width:${block.content.width}; display:block; margin:auto; border-radius:8px;"/>
          </td>
        </tr>`;

      case 'footer':
        const socialsHTML = Object.entries(block.content.socials || {})
          .filter(([_, url]) => url)
          .map(([platform, url]) => `<a href="${url}" style="color:#999; text-decoration:none; margin:0 8px;">${platform}</a>`)
          .join(' · ');
        return `
        <tr>
          <td style="background:#fafafa; padding:30px; font-size:12px; text-align:center; color:#999;">
            ${block.content.companyName} · ${block.content.location}
            <br><br>
            ${socialsHTML}
            <br><br>
            <a href="*|UNSUB|*" style="color:#999; text-decoration:underline;">Unsubscribe</a>
          </td>
        </tr>`;

      default:
        return '';
    }
  };

  const handleSave = () => {
    const html = generateHTML();
    onSave(subject, blocks, html);
  };

  const renderBlockEditor = (block: EmailBlock) => {
    const isEditing = editingBlock === block.id;

    return (
      <div key={block.id} className="border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 capitalize">
              {block.type}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => moveBlock(block.id, 'up')}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Move up"
            >
              <MoveUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveBlock(block.id, 'down')}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Move down"
            >
              <MoveDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingBlock(isEditing ? null : block.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteBlock(block.id)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="p-4 space-y-3 bg-white dark:bg-gray-800 dark:bg-gray-800">
            {renderBlockFields(block)}
          </div>
        )}
      </div>
    );
  };

  const renderBlockFields = (block: EmailBlock) => {
    switch (block.type) {
      case 'header':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Logo</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={block.content.logoUrl}
                  onChange={(e) => updateBlock(block.id, { ...block.content, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Logo URL o sube una imagen"
                />
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(block.id, file);
                      }}
                      className="hidden"
                    />
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {language === 'es' ? 'Subiendo...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {language === 'es' ? 'Subir Logo' : 'Upload Logo'}
                      </>
                    )}
                  </label>
                </div>
                {block.content.logoUrl && (
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <img src={block.content.logoUrl} alt="Logo preview" className="h-16 mx-auto object-contain" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Background Color</label>
              <input
                type="color"
                value={block.content.backgroundColor}
                onChange={(e) => updateBlock(block.id, { ...block.content, backgroundColor: e.target.value })}
                className="w-full h-10 border rounded-lg"
              />
            </div>
          </>
        );

      case 'hero':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={block.content.title}
                onChange={(e) => updateBlock(block.id, { ...block.content, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subtitle</label>
              <textarea
                value={block.content.subtitle}
                onChange={(e) => updateBlock(block.id, { ...block.content, subtitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button Text</label>
              <input
                type="text"
                value={block.content.buttonText}
                onChange={(e) => updateBlock(block.id, { ...block.content, buttonText: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button URL</label>
              <input
                type="url"
                value={block.content.buttonUrl}
                onChange={(e) => updateBlock(block.id, { ...block.content, buttonUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Background Color</label>
                <input
                  type="color"
                  value={block.content.backgroundColor}
                  onChange={(e) => updateBlock(block.id, { ...block.content, backgroundColor: e.target.value })}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Button Color</label>
                <input
                  type="color"
                  value={block.content.buttonColor}
                  onChange={(e) => updateBlock(block.id, { ...block.content, buttonColor: e.target.value })}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={block.content.title}
                onChange={(e) => updateBlock(block.id, { ...block.content, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Body</label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                {/* Formatting Toolbar */}
                <div className="flex gap-1 p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => applyTextFormat(block.id, 'bold')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTextFormat(block.id, 'italic')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTextFormat(block.id, 'underline')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => applyTextFormat(block.id, 'ul')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTextFormat(block.id, 'ol')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => applyTextFormat(block.id, 'link')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
                {/* Text Area */}
                <textarea
                  ref={(el) => { textAreaRefs.current[block.id] = el; }}
                  value={block.content.body}
                  onChange={(e) => updateBlock(block.id, { ...block.content, body: e.target.value })}
                  className="w-full px-3 py-2 border-0 focus:ring-0 font-mono text-sm"
                  rows={8}
                  placeholder="Selecciona texto y usa los botones arriba para darle formato..."
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {language === 'es'
                  ? 'Tip: Selecciona texto y usa los botones para aplicar formato HTML'
                  : 'Tip: Select text and use buttons to apply HTML formatting'}
              </p>
            </div>
          </>
        );

      case 'features':
        return (
          <div className="space-y-4">
            {block.content.features.map((feature: any, idx: number) => (
              <div key={idx} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Feature {idx + 1}</span>
                  {block.content.features.length > 1 && (
                    <button
                      onClick={() => {
                        const newFeatures = block.content.features.filter((_: any, i: number) => i !== idx);
                        updateBlock(block.id, { ...block.content, features: newFeatures });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={feature.icon}
                  onChange={(e) => {
                    const newFeatures = [...block.content.features];
                    newFeatures[idx].icon = e.target.value;
                    updateBlock(block.id, { ...block.content, features: newFeatures });
                  }}
                  placeholder="Emoji (e.g., 💪)"
                  className="w-full px-3 py-2 border rounded-lg text-center text-2xl"
                />
                <input
                  type="text"
                  value={feature.title}
                  onChange={(e) => {
                    const newFeatures = [...block.content.features];
                    newFeatures[idx].title = e.target.value;
                    updateBlock(block.id, { ...block.content, features: newFeatures });
                  }}
                  placeholder="Title"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  value={feature.description}
                  onChange={(e) => {
                    const newFeatures = [...block.content.features];
                    newFeatures[idx].description = e.target.value;
                    updateBlock(block.id, { ...block.content, features: newFeatures });
                  }}
                  placeholder="Description"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            ))}
            {block.content.features.length < 6 && (
              <button
                onClick={() => {
                  const newFeatures = [
                    ...block.content.features,
                    { icon: '🎯', title: 'New Feature', description: 'Description' }
                  ];
                  updateBlock(block.id, { ...block.content, features: newFeatures });
                }}
                className="w-full py-2 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Feature
              </button>
            )}
          </div>
        );

      case 'cta':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Button Text</label>
              <input
                type="text"
                value={block.content.text}
                onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                type="url"
                value={block.content.url}
                onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Background</label>
                <input
                  type="color"
                  value={block.content.backgroundColor}
                  onChange={(e) => updateBlock(block.id, { ...block.content, backgroundColor: e.target.value })}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Text Color</label>
                <input
                  type="color"
                  value={block.content.textColor}
                  onChange={(e) => updateBlock(block.id, { ...block.content, textColor: e.target.value })}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
            </div>
          </>
        );

      case 'image':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Image</label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={block.content.url}
                  onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Image URL o sube una imagen"
                />
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(block.id, file);
                    }}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {language === 'es' ? 'Subiendo...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {language === 'es' ? 'Subir Imagen' : 'Upload Image'}
                    </>
                  )}
                </label>
                {block.content.url && (
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <img src={block.content.url} alt="Preview" className="max-h-48 mx-auto object-contain rounded" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Alt Text</label>
              <input
                type="text"
                value={block.content.alt}
                onChange={(e) => updateBlock(block.id, { ...block.content, alt: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={language === 'es' ? 'Descripción de la imagen' : 'Image description'}
              />
            </div>
          </>
        );

      case 'footer':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={block.content.companyName}
                onChange={(e) => updateBlock(block.id, { ...block.content, companyName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                value={block.content.location}
                onChange={(e) => updateBlock(block.id, { ...block.content, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Social Links</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  <input
                    type="url"
                    value={block.content.socials?.instagram || ''}
                    onChange={(e) => updateBlock(block.id, {
                      ...block.content,
                      socials: { ...block.content.socials, instagram: e.target.value }
                    })}
                    placeholder="Instagram URL"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-blue-600" />
                  <input
                    type="url"
                    value={block.content.socials?.linkedin || ''}
                    onChange={(e) => updateBlock(block.id, {
                      ...block.content,
                      socials: { ...block.content.socials, linkedin: e.target.value }
                    })}
                    placeholder="LinkedIn URL"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-blue-400" />
                  <input
                    type="url"
                    value={block.content.socials?.twitter || ''}
                    onChange={(e) => updateBlock(block.id, {
                      ...block.content,
                      socials: { ...block.content.socials, twitter: e.target.value }
                    })}
                    placeholder="Twitter URL"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-700" />
                  <input
                    type="url"
                    value={block.content.socials?.facebook || ''}
                    onChange={(e) => updateBlock(block.id, {
                      ...block.content,
                      socials: { ...block.content.socials, facebook: e.target.value }
                    })}
                    placeholder="Facebook URL"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Meta */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Asunto del Email' : 'Email Subject'}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asciende: Nuevas mejoras en tu rendimiento 🚀"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-lg font-medium"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Texto de Vista Previa' : 'Preview Text'}
          </label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Evoluciona tu entrenamiento con herramientas profesionales"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg"
          />
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
          {language === 'es' ? 'Contenido del Email' : 'Email Content'}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'edit'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300'
            }`}
          >
            <Type className="w-4 h-4 inline mr-2" />
            {language === 'es' ? 'Editar' : 'Edit'}
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'preview'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            {language === 'es' ? 'Vista Previa' : 'Preview'}
          </button>
        </div>
      </div>

      {viewMode === 'edit' ? (
        <>
          {/* Blocks Editor */}
          <div className="space-y-3">
            {blocks.map(block => renderBlockEditor(block))}
          </div>

          {/* Add Block Menu */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 dark:border-gray-600 p-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-3">
              {language === 'es' ? 'Agregar Bloque' : 'Add Block'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => addBlock('header')}
                className="p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 flex flex-col items-center gap-2"
              >
                <Layout className="w-5 h-5" />
                <span className="text-xs">Header</span>
              </button>
              <button
                onClick={() => addBlock('hero')}
                className="p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 flex flex-col items-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-xs">Hero</span>
              </button>
              <button
                onClick={() => addBlock('text')}
                className="p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 flex flex-col items-center gap-2"
              >
                <Type className="w-5 h-5" />
                <span className="text-xs">Text</span>
              </button>
              <button
                onClick={() => addBlock('features')}
                className="p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 flex flex-col items-center gap-2"
              >
                <Layout className="w-5 h-5" />
                <span className="text-xs">Features</span>
              </button>
              <button
                onClick={() => addBlock('cta')}
                className="p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 flex flex-col items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs">CTA</span>
              </button>
              <button
                onClick={() => addBlock('image')}
                className="p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 flex flex-col items-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-xs">Image</span>
              </button>
              <button
                onClick={() => addBlock('footer')}
                className="p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 flex flex-col items-center gap-2"
              >
                <Layout className="w-5 h-5" />
                <span className="text-xs">Footer</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
          <div className="bg-gray-100 dark:bg-gray-800 dark:bg-gray-900 p-8 rounded-lg">
            <div
              className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: generateHTML() }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <button
          onClick={() => {
            const html = generateHTML();
            navigator.clipboard.writeText(html);
            alert(language === 'es' ? 'HTML copiado al portapapeles' : 'HTML copied to clipboard');
          }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
        >
          <Code className="w-4 h-4" />
          {language === 'es' ? 'Copiar HTML' : 'Copy HTML'}
        </button>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-semibold rounded-lg hover:bg-[#ffd51a] transition-colors"
        >
          <Send className="w-5 h-5" />
          {language === 'es' ? 'Guardar y Continuar' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
