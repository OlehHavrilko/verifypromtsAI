import { ImageAnalyzer } from "@/components/ImageAnalyzer";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PageMeta } from "@/components/PageMeta";

const ImageAnalyzerPage = () => {
  const { language } = useLanguage();
  
  return (
    <>
      <PageMeta title={"Image Analyzer — PromptForge"} description={"Upload an image and turn it into a detailed AI prompt. Extract style, subject and composition cues for image generation models."} path="/app/images" />
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4 text-foreground">
        {language === 'en' ? 'Image Analyzer' : language === 'ua' ? 'Аналіз зображень' : 'Анализ изображений'}
      </h1>
      <div className="glass-strong rounded-xl p-5">
        <ImageAnalyzer />
      </div>
    </div>
    </>
  );
};

export default ImageAnalyzerPage;
