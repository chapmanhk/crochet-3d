@e2e
Feature: Pattern validation
  As a crocheter
  I want clear feedback when I try an invalid action
  So that I understand what to do next

  Background:
    Given I am using the crochet pattern designer

  Scenario: Add SC is disabled without a foundation chain
    Given I have no pattern
    Then the "Add SC" control should be disabled

  Scenario: New Row is disabled without a foundation chain
    Given I have no pattern
    Then the "New Row" control should be disabled

  Scenario: Add SC is disabled on the foundation row
    Given I have a foundation chain of 3
    Then the "Add SC" control should be disabled

  Scenario: New Row is disabled while the current row is incomplete
    Given I have a foundation chain of 3
    And I am on row 1
    And I have placed 1 single crochet stitch on the current row
    Then the "New Row" control should be disabled

  Scenario: Reset is disabled with no pattern
    Given I have no pattern
    Then the "Reset" control should be disabled

  Scenario: Disabled toolbar buttons expose reasons to assistive technology
    Given I have no pattern
    Then the "Add SC" control should be disabled
    And the "Add SC" control should have an accessible disabled reason

  @engine
  Scenario: Cannot start a new row with no stitches on the current row
    Given I have a foundation chain of 3
    And I am on row 1
    And I have placed 0 single crochet stitches on the current row
    When I try to start a new row
    Then the operation should be rejected
