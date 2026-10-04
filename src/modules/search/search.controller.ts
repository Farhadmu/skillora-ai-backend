import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Unified Global Search')
@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across skills, jobs, projects, assessments, and knowledge' })
  search(@Query('q') query: string) {
    return this.searchService.globalSearch(query || '');
  }
}
