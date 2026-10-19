package io.github.danieltinois.resumetailor.resume;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import io.github.danieltinois.resumetailor.common.Language;

class PeriodsTest {

    @ParameterizedTest
    @CsvSource(nullValues = "null", value = {
            "2025-01, null, EN, Jan 2025 – Present",
            "2020-03, 2022-11, EN, Mar 2020 – Nov 2022",
            "2020, null, EN, 2020 – Present",
            "2025-01, null, PT, jan 2025 – Atual",
            "2020-03, 2022-11, PT, mar 2020 – nov 2022",
            "null, 2019-07, EN, Jul 2019",
    })
    void formats(String start, String end, Language language, String expected) {
        assertThat(Periods.format(start, end, language)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"EN", "PT"})
    void noDatesAtAllIsEmpty(Language language) {
        assertThat(Periods.format(null, null, language)).isEmpty();
    }
}
