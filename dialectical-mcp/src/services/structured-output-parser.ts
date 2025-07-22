import { z } from 'zod';

export class StructuredOutputParser {
  
  /**
   * Parses and validates JSON output against a schema
   */
  async parse(content: string, schema: any): Promise<any> {
    // First, try to extract JSON from the content
    const jsonMatch = this.extractJSON(content);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    try {
      const parsed = JSON.parse(jsonMatch);
      
      // If we have a JSON schema, convert it to Zod for validation
      if (schema.type === 'object' && schema.properties) {
        const zodSchema = this.jsonSchemaToZod(schema);
        return zodSchema.parse(parsed);
      }
      
      // Otherwise return the parsed JSON
      return parsed;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`JSON validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }
  
  /**
   * Extracts JSON from mixed content (e.g., markdown with embedded JSON)
   */
  private extractJSON(content: string): string | null {
    // Try to find JSON in code blocks first
    const codeBlockMatch = content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // Try to find raw JSON
    const jsonPatterns = [
      /(\{[\s\S]*\})/,  // Object
      /(\[[\s\S]*\])/   // Array
    ];
    
    for (const pattern of jsonPatterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          // Validate it's actually JSON
          JSON.parse(match[1]);
          return match[1];
        } catch {
          // Not valid JSON, continue searching
          continue;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Converts a simple JSON schema to Zod schema
   */
  private jsonSchemaToZod(jsonSchema: any): z.ZodSchema {
    if (jsonSchema.type === 'object' && jsonSchema.properties) {
      const shape: Record<string, z.ZodSchema> = {};
      
      for (const [key, value] of Object.entries(jsonSchema.properties)) {
        shape[key] = this.jsonPropertyToZod(value as any);
      }
      
      return z.object(shape);
    }
    
    if (jsonSchema.type === 'array' && jsonSchema.items) {
      return z.array(this.jsonPropertyToZod(jsonSchema.items));
    }
    
    return z.any();
  }
  
  /**
   * Converts a JSON schema property to Zod
   */
  private jsonPropertyToZod(prop: any): z.ZodSchema {
    switch (prop.type) {
      case 'string':
        if (prop.enum) {
          return z.enum(prop.enum as [string, ...string[]]);
        }
        return z.string();
        
      case 'number':
        return z.number();
        
      case 'boolean':
        return z.boolean();
        
      case 'array':
        if (prop.items) {
          return z.array(this.jsonPropertyToZod(prop.items));
        }
        return z.array(z.any());
        
      case 'object':
        if (prop.properties) {
          return this.jsonSchemaToZod(prop);
        }
        return z.object({});
        
      default:
        return z.any();
    }
  }
  
  /**
   * Formats a schema for inclusion in prompts
   */
  formatSchemaForPrompt(schema: any): string {
    return JSON.stringify(schema, null, 2);
  }
  
  /**
   * Creates a retry prompt when JSON parsing fails
   */
  createRetryPrompt(originalContent: string, error: string, schema: any): string {
    return `Your previous response contained invalid JSON. Error: ${error}

Please provide a valid JSON response that matches this schema:
${this.formatSchemaForPrompt(schema)}

Remember to:
1. Return ONLY valid JSON
2. Ensure all required fields are present
3. Use the correct data types
4. Follow the enum values if specified

Try again with properly formatted JSON:`;
  }
}