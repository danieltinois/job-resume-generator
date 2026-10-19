package io.github.danieltinois.resumetailor.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** Query parameters say {@code lang=pt} or {@code lang=en}; any case is accepted. */
    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, Language.class, Language::of);
    }
}
