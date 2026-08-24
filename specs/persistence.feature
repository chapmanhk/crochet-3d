@e2e
Feature: Pattern persistence
  As a crocheter
  I want to save, load, and share my patterns
  So that my work survives refresh and can be shared outside the app

  Background:
    Given I am using the crochet pattern designer

  Scenario: Save pattern downloads a JSON file
    Given I have a foundation chain of 3
    And I am on row 1
    And I have placed 1 single crochet stitches on the current row
    When I choose "Save pattern"
    Then a pattern JSON file should be downloaded

  Scenario: Load pattern replaces the current work after confirmation
    Given I have a foundation chain of 5
    When I load a saved pattern JSON file for a foundation chain of 2 with one completed row
    And I confirm replacing the current pattern
    Then the stitch count should be 4
    And the instructions should include "Foundation: ch 2"
    And the instructions should include "Row 1: work across (2 sc)"

  Scenario: Load pattern is cancelled without replacing work
    Given I have a foundation chain of 5
    When I load a saved pattern JSON file for a foundation chain of 2 with one completed row
    And I cancel replacing the current pattern
    Then the stitch count should be 5

  Scenario: Invalid pattern file shows an error
    Given I have no pattern
    When I load an invalid pattern JSON file
    Then I should see an error "Could not load pattern file."

  Scenario: Copy instructions places pattern text on the clipboard
    Given I have a foundation chain of 3
    When I choose "Copy instructions"
    Then the clipboard should contain "Foundation: ch 3"

  Scenario: Export instructions downloads a markdown file
    Given I have a foundation chain of 3
    When I choose "Export instructions"
    Then an instructions markdown file should be downloaded

  @e2e
  Scenario: Pattern restores from autosave after refresh
    Given I have a foundation chain of 3
    And I am on row 1
    And I have placed 1 single crochet stitches on the current row
    When I refresh the app
    Then the stitch count should be 4
    And I should see next-step guidance to "Restored your last pattern."

  @engine
  Scenario: Saved pattern round-trips through JSON export and import
    Given I have a foundation chain of 2 with one completed row
    When I export the pattern to JSON
    And I import the same JSON into a new session
    Then the stitch count should match the original pattern
