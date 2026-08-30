@e2e
Feature: Reset pattern
  As a crocheter
  I want to clear my current pattern and start over
  So that I can try a different design

  Background:
    Given I am using the crochet pattern designer

  Scenario: Reset clears an existing pattern
    Given I have a foundation chain of 2
    When I choose "Reset" and confirm
    Then the pattern status should be "No pattern"
    And the stitch count should be 0
    And I should see guidance to "Start with a foundation chain."

  Scenario: Declining reset keeps the existing pattern
    Given I have a foundation chain of 2
    When I choose "Reset"
    And I choose "Cancel" in the confirmation dialog
    Then the pattern status should be "Foundation"
    And the stitch count should be 2

  Scenario: Reset with no pattern is disabled
    Given I have no pattern
    Then the "Reset" control should be disabled
    And the disabled reason should explain there is no pattern to reset
