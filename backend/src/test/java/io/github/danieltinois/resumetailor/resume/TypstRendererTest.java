package io.github.danieltinois.resumetailor.resume;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class TypstRendererTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    static ResumeDocument document(String lang, String achievement) {
        return new ResumeDocument(lang,
                new ResumeDocument.Personal("Alex Fictitious", "Backend Engineer", "Lisbon", "alex@example.com", "",
                        "", ""),
                "Summary.",
                List.of(new ResumeDocument.Category("Languages", List.of("Java", "SQL"))),
                List.of(new ResumeDocument.ExperienceEntry("Example Payments", "Engineer",
                        "pt".equals(lang) ? "jan 2023 – Atual" : "Jan 2023 – Present",
                        List.of(new ResumeDocument.AchievementEntry("ach_00000001", achievement)))),
                List.of(), List.of(), List.of());
    }

    static String text(byte[] pdf) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }

    private static long renderDirs() throws IOException {
        return tempDirs("resume-render-");
    }

    private static long tempDirs(String prefix) throws IOException {
        try (Stream<Path> entries = Files.list(Path.of(System.getProperty("java.io.tmpdir")))) {
            return entries.filter(p -> p.getFileName().toString().startsWith(prefix)).count();
        }
    }

    @Test
    void closeDeletesUnpackedTemplate() throws IOException {
        long before = tempDirs("resume-typst-");
        TypstRenderer renderer = new TypstRenderer(new TypstProperties("typst", TIMEOUT, 0));
        assertThat(tempDirs("resume-typst-")).isEqualTo(before + 1);

        renderer.close();

        assertThat(tempDirs("resume-typst-")).isEqualTo(before);
    }

    @Test
    void compileErrorIsLoggedButNotExposed(@TempDir Path scripts, CapturedOutput output) throws IOException {
        Path failing = scripts.resolve("failing-typst.sh");
        Files.writeString(failing, "#!/bin/sh\necho 'error: internal detail /srv/secret' >&2\nexit 1\n");
        failing.toFile().setExecutable(true);
        try (TypstRenderer renderer = new TypstRenderer(new TypstProperties(failing.toString(), TIMEOUT, 0))) {
            assertThatThrownBy(() -> renderer.render(document("en", "x")))
                    .isInstanceOf(RenderException.class)
                    .hasMessageNotContaining("/srv/secret");
        }

        assertThat(output).contains("error: internal detail /srv/secret");
    }

    @Test
    void rendersPdfWithSelectableText() throws IOException {
        TypstRenderer renderer = new TypstRenderer(new TypstProperties("typst", TIMEOUT, 0));

        byte[] pdf = renderer.render(document("en", "Shipped the payments API."));

        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
        assertThat(text(pdf)).contains("Alex Fictitious", "EXPERIENCE", "Shipped the payments API.");
    }

    @Test
    void rendersPortugueseLabels() throws IOException {
        TypstRenderer renderer = new TypstRenderer(new TypstProperties("typst", TIMEOUT, 0));

        String text = text(renderer.render(document("pt", "Entreguei a API.")));

        assertThat(text).contains("EXPERIÊNCIA", "COMPETÊNCIAS", "Atual").doesNotContain("EXPERIENCE");
    }

    @Test
    void typstSpecialCharactersAreLiteral() throws IOException {
        String tricky = "Cut #costs by 30% with $vars, @refs, <tags>, *stars* and _under_";
        TypstRenderer renderer = new TypstRenderer(new TypstProperties("typst", TIMEOUT, 0));

        assertThat(text(renderer.render(document("en", tricky)))).contains(tricky);
    }

    @Test
    void failsWhenBinaryMissing() {
        TypstRenderer renderer = new TypstRenderer(new TypstProperties("typst-does-not-exist", TIMEOUT, 0));

        assertThatThrownBy(() -> renderer.render(document("en", "x"))).isInstanceOf(RenderException.class);
    }

    @Test
    void timesOutAndCleansUp(@TempDir Path scripts) throws IOException {
        Path slow = scripts.resolve("slow-typst.sh");
        Files.writeString(slow, "#!/bin/sh\nsleep 5\n");
        slow.toFile().setExecutable(true);
        long before = renderDirs();
        TypstRenderer renderer = new TypstRenderer(new TypstProperties(slow.toString(), Duration.ofMillis(200), 0));

        long start = System.nanoTime();
        assertThatThrownBy(() -> renderer.render(document("en", "x")))
                .isInstanceOf(RenderException.class)
                .hasMessageContaining("timed out");

        assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(2));
        assertThat(renderDirs()).isEqualTo(before);
    }

    @Test
    void concurrentRendersBeyondLimitAllSucceed() throws Exception {
        long before = renderDirs();
        TypstRenderer renderer = new TypstRenderer(new TypstProperties("typst", TIMEOUT, 2));
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            List<Future<byte[]>> results = new ArrayList<>();
            for (int i = 0; i < 6; i++) {
                String bullet = "Bullet number " + i;
                results.add(pool.submit(() -> renderer.render(document("en", bullet))));
            }
            for (int i = 0; i < 6; i++) {
                assertThat(text(results.get(i).get())).contains("Bullet number " + i);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(renderDirs()).isEqualTo(before);
    }
}
