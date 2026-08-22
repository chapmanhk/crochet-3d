@e2e
Feature: Single crochet rows
  As a crocheter
  I want to work single crochet rows on top of my foundation chain
  So that I can build up my pattern row by row

  Background:
    Given I am using the crochet pattern designer
    And I have a foundation chain of 3

  Scenario: Start the first working row after foundation
    When I choose "New Row"
    Then the pattern status should be "Row 1"
    And the row progress should be "0/3"

  Scenario: Add single crochet stitches across a row
    Given I am on row 1
    When I choose "Add SC"
    Then the stitch count should be 4
    And the row progress should be "1/3"
    And the instructions should include "Row 1: sc in each st across (1 sc)"
    And I should see next-step guidance to "Place 2 more single crochet stitches on row 1."
    When I choose "Add SC"
    And I choose "Add SC"
    Then the stitch count should be 6
    And the row progress should be "3/3"
    And the instructions should include "Row 1: sc in each st across (3 sc)"
    And I should see next-step guidance to "Row 1 is complete. Choose New Row to continue."

  Scenario: Work a second row after completing the first
    Given I am on row 1
    And I have placed 3 single crochet stitches on the current row
    When I choose "New Row"
    Then the pattern status should be "Row 2"
    And the row progress should be "0/3"
    When I choose "Add SC"
    Then the stitch count should be 7
    And the instructions should include "Row 2: sc in each st across (1 sc)"

  @engine
  Scenario: Cannot add single crochet on the foundation row
    Given I am on row 0
    When I try to add a single crochet stitch
    Then the operation should be rejected with message about row 1 or later

  @engine
  Scenario: Row cannot exceed foundation length
    Given I am on row 1
    And I have placed 3 single crochet stitches on the current row
    When I try to add another single crochet stitch
    Then the operation should be rejected
