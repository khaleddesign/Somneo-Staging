"use client"

import AppLayout from '@/components/custom/AppLayout'
import { StudyList } from '@/components/custom/StudyList'
import { useStudies } from '@/hooks/useStudies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function ClientStudiesPage() {
  const { studies: myStudies, loading: myLoading, error: myError } = useStudies(100, 'mine')
  const { studies: instStudies, loading: instLoading, error: instError } = useStudies(100, 'institution')

  return (
    <AppLayout>
      <div className="p-5 md:p-8 space-y-6">
        <div>
          <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">
            Études
          </h1>
          <p className="text-gray-500 mt-2 font-body">
            Retrouvez vos études et celles de votre institution.
          </p>
        </div>

        <Tabs defaultValue="mine">
          <TabsList className="mb-4">
            <TabsTrigger value="mine">
              Mes études
              {!myLoading && (
                <span className="ml-2 bg-teal/10 text-teal text-xs font-heading px-2 py-0.5 rounded-full">
                  {myStudies.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="institution">
              Mon institution
              {!instLoading && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-heading px-2 py-0.5 rounded-full">
                  {instStudies.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-midnight font-heading">
                  Mes études soumises
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StudyList
                  studies={myStudies}
                  loading={myLoading}
                  error={myError}
                  role="client"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="institution">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-midnight font-heading">
                  Toutes les études de mon institution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StudyList
                  studies={instStudies}
                  loading={instLoading}
                  error={instError}
                  role="client"
                  showOwner={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
