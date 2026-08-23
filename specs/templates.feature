@e2e
Feature: Pattern templates
  As a crocheter
  I want to start from a template
  So that I can learn with a small example pattern

  Background:
    Given I am using the crochet pattern designer

  Scenario: Load a coaster template
    When I choose "Templates"
    And I choose the "Coaster" template
    Then the stitch count should be greater than 0
    And the instructions should not be empty

  Scenario: Load a swatch template
    When I choose "Templates"
    And I choose the "Swatch" template
    Then the instructions should include "hdc"
