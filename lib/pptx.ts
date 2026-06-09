import JSZip from 'jszip';

export interface SlideContent {
  number: number;
  text: string;
}

export async function extractPptxSlides(buffer: Buffer): Promise<SlideContent[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slides: SlideContent[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)![1]);
      const numB = parseInt(b.match(/(\d+)/)![1]);
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const texts: string[] = [];
    const re = /<a:t(?:\s[^>]*)?>([^<]+)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const t = m[1].trim();
      if (t) texts.push(t);
    }
    if (texts.length > 0) {
      slides.push({ number: i + 1, text: texts.join(' ') });
    }
  }

  return slides;
}
